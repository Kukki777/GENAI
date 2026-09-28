const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const {
  generateInterviewReport,
  generateresumepdf
} = require("../sevices/ai.service");

const {Interviewreport} = require("../model/interviewreport.model");
// const { interviewewportbyid } = require("../../../frontend/src/features/interview/services/interview.api");

async function generateInterviewReportcontroller(req, res) {
  try {
    const resumefile = req.file;

    if (!resumefile) {
      return res.status(400).json({
        message: "Resume file is required",
      });
    }

    console.log("FILE:", {
      originalname: resumefile.originalname,
      mimetype: resumefile.mimetype,
      size: resumefile.size,
    });

    let resumeText = "";

    // PDF
    if (
      resumefile.mimetype === "application/pdf" ||
      resumefile.originalname.toLowerCase().endsWith(".pdf")
    ) {
      const parser = new PDFParse({
        data: resumefile.buffer,
      });

      const result = await parser.getText();

      resumeText = result.text;

      await parser.destroy();
    }

    // DOCX
    else if (
      resumefile.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      resumefile.originalname.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({
        buffer: resumefile.buffer,
      });

      resumeText = result.value;
    }

    // Unsupported file
    else {
      return res.status(400).json({
        message: "Only PDF and DOCX files are supported",
      });
    }

    console.log("RESUME TEXT:");
    console.log(resumeText);

    const {
      selfdescription,
      jobdescription,
      title
    } = req.body;

    if (!selfdescription || !jobdescription) {
      return res.status(400).json({
        message: "Self description and job description are required",
      });
    }

    const report = await generateInterviewReport({
      resume: resumeText,
      selfdescription,
      jobdescription,
    });

    console.log("AI REPORT:");
    console.dir(report, { depth: null });

    const savedReport = await Interviewreport.create({

      user: req.user.userId,
      title,
      jobdescription,
      resume: resumeText,
      selfdescription,
      ...report,
    });

    return res.status(201).json({
      message: "Interview report generated successfully",
      interviewreport: savedReport,
    });

  } catch (error) {
    console.error("INTERVIEW REPORT ERROR:", error);

    return res.status(500).json({
      message: "Failed to generate interview report",
      error: error.message,
    });
  }
}

async function getReportByIdcontroller(req, res) {
  try {

    const { interviewId } = req.params;

    console.log("INTERVIEW ID:", interviewId);

    const report = await Interviewreport.findById(
      interviewId,
      { user: 0 }
    );

    if (!report) {
      return res.status(404).json({
        message: "Interview report not found",
      });
    }

    return res.status(200).json({
      message: "Interview report fetched successfully",
      report,
    });

  } catch (error) {

    console.error("INTERVIEW REPORT ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch interview report",
      error: error.message,
    });
  }
}

async function getallinterviewreportscontroller(req, res) {

    const reports = await Interviewreport
        .find({ user: req.user.userId })
        .select("-resume -selfdescription -jobdescription -__v -technicalquestions -behaviourquestions -skillgap -preperationplan")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        message: "Interview reports fetched successfully",
        reports
    });
}

async function generateResumePDFcontroller(req, res) {
  try {
    const { interviewId } = req.params;

    console.log("INTERVIEW ID:", interviewId);

    const report = await Interviewreport.findById(interviewId);

    if (!report) {
      return res.status(404).json({
        message: "Interview report not found",
      });
    }

    const {
      resume,
      jobdescription,
      selfdescription,
      title,
    } = report;

    const pdfBuffer = await generateresumepdf({
      resume,
      jobdescription,
      selfdescription,
      title,
    });

    // Tell browser/frontend that this is a PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${title || "resume"}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error("RESUME PDF ERROR:", error);

    return res.status(500).json({
      message: "Failed to generate resume PDF",
      error: error.message,
    });
  }
}

module.exports = {
  generateInterviewReportcontroller,
  getReportByIdcontroller,
  getallinterviewreportscontroller,
  generateResumePDFcontroller
};