const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const puppeteer = require("puppeteer");

const MODEL = "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// --------------------------------------------------
// RETRY HELPER
// Tries the same model up to 3 times
// --------------------------------------------------

async function generateWithRetry(request, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `Trying Gemini model: ${MODEL} (attempt ${attempt}/${retries})`
      );

      return await ai.models.generateContent({
        ...request,
        model: MODEL,
      });

    } catch (error) {
      const is503 =
        error?.status === 503 ||
        error?.code === 503 ||
        error?.message?.includes("high demand") ||
        error?.message?.includes("UNAVAILABLE");

      if (!is503 || attempt === retries) {
        throw error;
      }

      const delay = attempt * 3000;

      console.log(
        `Gemini temporarily unavailable. Retrying in ${
          delay / 1000
        }s...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }
}

// --------------------------------------------------
// INTERVIEW REPORT SCHEMA
// --------------------------------------------------

const interviewreport = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "The match score of the candidate based on their resume, self description, and job description, from 0 to 100"
    ),

  technicalquestions: z.array(
    z.object({
      question: z
        .string()
        .describe(
          "A technical question that can be asked in the interview"
        ),

      intension: z
        .string()
        .describe(
          "The intention of the interviewer behind asking this question"
        ),

      answer: z
        .string()
        .describe(
          "How the candidate should answer, including points to cover and approach"
        ),
    })
  ),

  behaviourquestions: z.array(
    z.object({
      question: z
        .string()
        .describe(
          "A behavioral question that can be asked in the interview"
        ),

      intension: z
        .string()
        .describe(
          "The intention of the interviewer behind asking this question"
        ),

      answer: z
        .string()
        .describe(
          "How the candidate should answer, including points to cover and approach"
        ),
    })
  ),

  skillgap: z.array(
    z.object({
      skill: z
        .string()
        .describe(
          "The skill in which the candidate has a gap"
        ),

      severity: z
        .string()
        .describe(
          "Severity of the skill gap, for example Low, Medium, or High"
        ),
    })
  ),

  preperationplan: z.array(
    z.object({
      day: z
        .number()
        .describe(
          "Day number in the preparation plan, starting from 1"
        ),

      focus: z
        .string()
        .describe(
          "Main focus area for this day"
        ),

      tasks: z
        .array(z.string())
        .describe(
          "List of tasks the candidate should complete on this day"
        ),
    }).meta({
      title: "Preperation Plan",
    })
  ),
});

// --------------------------------------------------
// GENERATE INTERVIEW REPORT
// --------------------------------------------------

async function generateInterviewReport({
  resume,
  selfdescription,
  jobdescription,
}) {
  const prompt = `
You are an expert technical interviewer and career coach.

Analyze the candidate carefully based on their resume, self-description,
and the target job description.

Your analysis must be specific to this candidate and this particular job.

CANDIDATE RESUME:
${resume}

CANDIDATE SELF DESCRIPTION:
${selfdescription}

TARGET JOB DESCRIPTION:
${jobdescription}

TASK:

1. Calculate a realistic match score from 0 to 100.

2. Identify the candidate's strongest areas relevant to the target job.

3. Identify genuine skill gaps by comparing the candidate's existing
skills and experience with the job requirements.

4. Generate technical interview questions that are relevant to:
   - The candidate's actual technical skills
   - Their projects
   - Their work experience
   - Technologies mentioned in the job description
   - Areas where the candidate may have weaknesses

5. Generate behavioral interview questions relevant to:
   - The candidate's experience
   - Their projects
   - Teamwork
   - Leadership
   - Problem solving
   - Client interaction
   - Achievements

6. For every question:
   - Explain the interviewer's intention.
   - Explain how the candidate should approach the answer.
   - Mention the important points the candidate should cover.

7. Create a practical preparation plan starting from Day 1.
   The plan should prioritize the candidate's actual skill gaps and the
   requirements of the target job.

IMPORTANT:

- Do not invent experience that is not present in the resume.
- Do not assume the candidate knows a technology just because it appears
  in the job description.
- Distinguish between existing skills and missing skills.
- Base the skill-gap analysis on the actual candidate information.
- Questions should feel like realistic interview questions rather than
  generic questions.
- Make the preparation plan actionable.
- Keep the output detailed enough to be genuinely useful for interview
  preparation.
`;

  const response = await generateWithRetry({
    contents: prompt,

    config: {
      responseMimeType: "application/json",
      responseJsonSchema: interviewreport.toJSONSchema(),
    },
  });

  return JSON.parse(response.text);
}

// --------------------------------------------------
// GENERATE RESUME PDF
// --------------------------------------------------

async function generateresumepdf({
  resume,
  selfdescription,
  jobdescription,
  title,
}) {
  const resumepdfschema = z.object({
    html: z
      .string()
      .describe(
        "Complete HTML content of the resume which will be converted to PDF using Puppeteer"
      ),
  });

 const prompt = `
You are an expert professional resume designer, ATS resume specialist,
HTML/CSS developer, and technical recruiter.

Your task is to convert the candidate's existing resume into a polished,
professional, ATS-friendly, ONE-PAGE A4 resume in HTML.

The final resume should look like a real professionally designed
software-engineering resume, NOT like an AI-generated document.

==================================================
CANDIDATE INFORMATION
==================================================

EXISTING RESUME:
${resume}

SELF DESCRIPTION:
${selfdescription}

TARGET JOB DESCRIPTION:
${jobdescription}

RESUME TITLE:
${title}

==================================================
MOST IMPORTANT DESIGN REQUIREMENTS
==================================================

1. HEADER / NAME

The candidate's name MUST be horizontally centered at the top of the page.

Example:

                    PRIYANSH AGRAWAL

The name must NOT be left aligned.

Use:
- Large font size
- Bold weight
- Strong visual hierarchy
- Professional dark color

The contact information should appear directly below the name
and should also be centered.

Example:

+91 XXXXXXXX | email@gmail.com | LinkedIn | GitHub | Portfolio

Keep the contact information compact and on one or two centered lines.

==================================================
2. PROFESSIONAL VISUAL STYLE
==================================================

Create a clean, modern, professional software-engineering resume.

The design should be similar to a high-quality professionally designed
college/student software engineer resume.

Use a restrained professional color palette.

IMPORTANT:

Do NOT make the entire resume black and white.

Use one professional accent color for:

- Section headings
- Small separators
- Important visual elements
- Possibly the candidate's name

Use colors subtly.

Do NOT use:
- Bright neon colors
- Excessive colors
- Large colored backgrounds
- Graphics
- Skill bars
- Progress charts
- Rating systems
- Decorative illustrations

The resume should remain ATS-friendly.

==================================================
3. PAGE UTILIZATION
==================================================

The resume MUST use the A4 page efficiently.

The current output must NOT leave a huge empty area at the bottom.

Use the available vertical space effectively.

IMPORTANT:

Do NOT artificially fill the page with meaningless text.

Instead, preserve relevant information from the original resume.

If the original resume contains multiple relevant projects,
achievements, work experience, technical skills, or education details,
retain them.

Do NOT aggressively remove useful information simply to make the
resume shorter.

The final resume should visually occupy most of the A4 page while
remaining clean and readable.

Aim for approximately 85-95% useful page utilization.

==================================================
4. ONE PAGE ONLY
==================================================

The final resume MUST fit on exactly ONE A4 page.

Do NOT create a second page.

Do NOT allow content to overflow to another page.

Use:

- Appropriate margins
- Compact but readable typography
- Efficient spacing
- Proper section spacing
- Appropriate line height
- Efficient bullet spacing

Do NOT make the font unnecessarily tiny just to fit everything.

Recommended general range:

Body text: 9.5-10.5px
Section headings: 11-13px
Candidate name: 22-28px

Adjust these values if necessary to make the resume fit naturally.

==================================================
5. TECHNICAL SKILLS LAYOUT
==================================================

DO NOT put all technical skills into one long line.

The technical skills section MUST be organized into separate
categories/rows.

For example:

TECHNICAL SKILLS

Languages:
C++, JavaScript, Python, Java

Frontend:
React.js, Next.js, HTML5, CSS3, Tailwind CSS

Backend:
Node.js, Express.js, REST APIs

Databases:
MongoDB, SQL

Cloud & DevOps:
AWS (EC2, S3, IAM), Docker, Linux, Cloudinary

Tools:
Git, GitHub, Shell Scripting, Vercel

Each category should wrap naturally if the line becomes too long.

NEVER allow skills to overlap.

NEVER force all skills into a single line.

Use proper spacing between categories.

==================================================
6. CONTENT PRESERVATION
==================================================

The candidate's original resume contains important information.

Preserve relevant information including:

- Professional summary
- Education
- Work experience
- Freelance experience
- Projects
- Technical skills
- Achievements
- Hackathon victories
- DSA achievements
- Relevant metrics
- Relevant technologies

Do NOT remove an entire project just because another project is
more relevant.

Only reduce or remove information when it is clearly irrelevant
to the target job or genuinely redundant.

For example, if the candidate has multiple strong technical projects,
retain the most relevant projects and enough information to demonstrate
technical depth.

==================================================
7. JOB DESCRIPTION TAILORING
==================================================

Analyze the target job description carefully.

Prioritize skills, technologies, projects, and experiences that
already exist in the candidate's resume and are relevant to the job.

Naturally incorporate relevant keywords from the job description.

However:

DO NOT invent experience.

DO NOT claim that the candidate has used a technology that does not
appear in their existing resume or self-description.

For example, if the job description mentions:

Kubernetes

but the candidate has no Kubernetes experience,

DO NOT add Kubernetes to the candidate's skills.

The resume should be tailored, NOT fabricated.

==================================================
8. PROFESSIONAL SUMMARY
==================================================

Create a strong 2-4 line professional summary.

The summary should:

- Reflect the candidate's actual background
- Mention relevant technical strengths
- Highlight meaningful achievements
- Be tailored toward the target role
- Sound natural and human-written

Do NOT write generic AI-style statements such as:

"Passionate and highly motivated individual with a proven track record..."

Avoid unnecessary buzzwords.

==================================================
9. WORK EXPERIENCE
==================================================

Preserve the candidate's actual work experience.

Use:

Company / Role                          Dates

Then concise bullet points.

Each bullet should:

- Start with a strong action verb
- Explain what was done
- Mention technologies where relevant
- Include measurable impact when supported by the original resume

Do NOT invent metrics.

Do NOT invent responsibilities.

==================================================
10. PROJECTS
==================================================

Projects are extremely important for this candidate.

Preserve the strongest relevant projects.

For each project include:

Project Name | Technologies

Then 2-4 strong bullet points.

Prioritize:

- Technical implementation
- Architecture
- Backend/frontend work
- APIs
- Databases
- AI functionality
- Cloud deployment
- Measurable results

Do not reduce a technically strong project to only one vague bullet.

==================================================
11. ACHIEVEMENTS
==================================================

Preserve important achievements from the original resume.

For example:

- Hackathon victories
- 400+ DSA problems
- 10+ deployed projects
- Team leadership
- Number of competing teams

These are valuable for a student software engineer.

==================================================
12. EDUCATION
==================================================

Include the candidate's:

- University
- Degree
- Field
- Expected graduation
- CGPA
- Location when useful

Keep education concise.

==================================================
13. ATS COMPATIBILITY
==================================================

The resume MUST remain ATS-friendly.

Use:

- Semantic HTML
- Normal selectable text
- Standard section headings
- Standard bullet points
- Simple document structure
- Clear text hierarchy

Avoid:

- Images
- Text inside images
- Skill progress bars
- Charts
- Graphs
- Complex tables
- Decorative graphics
- JavaScript
- External frameworks
- External CSS
- Excessive icons

Do not use tables as the primary page layout.

CSS flexbox/grid may be used carefully for simple alignment,
but the content must remain readable when parsed by an ATS.

==================================================
14. SECTION DESIGN
==================================================

Each section should have a clear heading.

For example:

PROFESSIONAL SUMMARY
TECHNICAL SKILLS
WORK EXPERIENCE
PROJECTS
ACHIEVEMENTS
EDUCATION

Section headings should:

- Be bold
- Have a professional accent color
- Have a subtle underline or separator
- Have consistent spacing

Do not use excessively large headings.

==================================================
15. HTML STRUCTURE
==================================================

Return a complete valid HTML document.

Use:

<!DOCTYPE html>
<html>
<head>
<style>
...
</style>
</head>

<body>
...
</body>

</html>

All CSS MUST be inside the <style> tag.

Do NOT use external CSS.

Do NOT use JavaScript.

Do NOT use Markdown.

The document must render correctly in Puppeteer.

==================================================
16. A4 PRINTING
==================================================

Optimize the HTML specifically for Puppeteer A4 PDF generation.

Use appropriate CSS such as:

@page {
  size: A4;
  margin: 0;
}

The main resume container should be designed for an A4 page.

Ensure:

- No horizontal overflow
- No content overlap
- No accidental second page
- No huge empty bottom area
- No clipped text
- No overlapping skills
- No broken bullet points

==================================================
17. VERTICAL SPACING — VERY IMPORTANT
==================================================

DO NOT distribute sections evenly across the A4 page.

DO NOT use:
- justify-content: space-between
- justify-content: space-around
- justify-content: space-evenly
- min-height on sections
- fixed large heights
- viewport-based spacing such as vh
- large padding between sections
- large margin-bottom values

The resume must flow naturally from top to bottom.

Sections must be packed efficiently while remaining readable.

Use SMALL and CONSISTENT vertical spacing.

Recommended spacing:

Header:
- margin-bottom: 16px

Between major sections:
- margin-top: 10px to 14px
- margin-bottom: 6px to 10px

Section heading:
- margin-bottom: 5px

Between experience/project entries:
- margin-bottom: 6px to 9px

Between bullets:
- margin-bottom: 2px to 4px

Do NOT create large blank areas between sections.

The next section should begin shortly after the previous section's
content ends.

For example:

PROFESSIONAL SUMMARY
[summary text]

TECHNICAL SKILLS
[skills]

WORK EXPERIENCE
[experience]

KEY PROJECTS
[projects]

LEADERSHIP & ACHIEVEMENTS
[achievements]

EDUCATION
[education]

There should NOT be large blank spaces between these sections.

IMPORTANT:
The page should look like a compact professional one-page resume,
NOT like content positioned at fixed vertical coordinates.
==================================================
18. CONTACT INFORMATION
==================================================

Keep the contact information centered below the candidate's name.

Use simple text separators such as:

|

Do not use large icons.

Example:

+91 XXXXXXXX | email@gmail.com | LinkedIn | GitHub | Portfolio

==================================================
19. FACTUAL ACCURACY
==================================================

This rule is extremely important.

ONLY use information provided in:

- Existing resume
- Self description

You may rewrite wording.

You may improve grammar.

You may reorder information.

You may emphasize relevant information.

But you MUST NOT fabricate:

- Skills
- Experience
- Companies
- Projects
- Dates
- Certifications
- Achievements
- Technologies
- Metrics

==================================================
20. FINAL QUALITY CHECK
==================================================

Before producing the HTML, internally check:

✓ Is the candidate's name centered?
✓ Is the contact information centered?
✓ Is the resume exactly one A4 page?
✓ Is most of the page used effectively?
✓ Is there a large empty area at the bottom?
✓ Are technical skills separated into categories?
✓ Do skills wrap correctly?
✓ Is anything overlapping?
✓ Are section headings visually distinct?
✓ Is there a subtle professional accent color?
✓ Are important projects preserved?
✓ Are important achievements preserved?
✓ Is the resume ATS-friendly?
✓ Is all information factually supported?
✓ Does it look like a real human-written resume?
✓ Is the content tailored to the target job?

==================================================
FINAL OUTPUT
==================================================

Return ONLY a JSON object with exactly one field:

{
  "html": "COMPLETE HTML DOCUMENT HERE"
}

The "html" field must contain the complete valid HTML document.

Do not return explanations.

Do not return Markdown.

Do not return anything outside the JSON object.
`;

  const response = await generateWithRetry({
    contents: prompt,

    config: {
      responseMimeType: "application/json",
      responseJsonSchema: resumepdfschema.toJSONSchema(),
    },
  });

  // Gemini returns:
  // {
  //   "html": "<!DOCTYPE html>..."
  // }

  const result = JSON.parse(response.text);

  // --------------------------------------------------
  // PUPPETEER
  // --------------------------------------------------

  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(result.html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm",
      },
    });

    return pdfBuffer;

  } finally {
    await browser.close();
  }
}

// --------------------------------------------------
// EXPORT
// --------------------------------------------------

module.exports = {
  generateInterviewReport,
  generateresumepdf,
};