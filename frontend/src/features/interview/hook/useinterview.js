import {
    getallinterviewreports,
    generateinterviewreport,
    interviewewportbyid,
    generateresumepdf
} from "../services/interview.api";

import { useContext } from "react";
import { interviewContext } from "../interview.context";



export const useInterview = () => {


    const context = useContext(interviewContext);

    if (!context) {
        throw new Error(
            "useInterview must be used within a InterviewProvider"
        );
    }

    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context;

const generatereport = async ({
    jobdescription,
    selfdescription,
    resume,
    title
}) => {

    setLoading(true);

    try {

        console.log("1. Calling API");

        const data = await generateinterviewreport({
            jobdescription,
            selfdescription,
            resume,
            title
        });

        console.log("2. API RESPONSE:", data);

        setReport(data.interviewreport);

        console.log("3. Report set");

        return data;

    } catch (error) {

        console.error(
            "GENERATE REPORT ERROR:",
            error.response?.data || error
        );

        throw error;

    } finally {

        console.log("4. Setting loading false");

        setLoading(false);
    }
};

   const getreportbyid = async (interviewId) => {
    setLoading(true);

    try {
        const data = await interviewewportbyid(interviewId);

        console.log("REPORT BY ID RESPONSE:", data);

        setReport(data.report);

        return data;

    } catch (error) {
        console.error("Get report error:", error);
        throw error;

    } finally {
        setLoading(false);
    }
};


   const getallreports = async () => {
    try {

        console.log("Fetching all reports...");

        const data = await getallinterviewreports();

        console.log("ALL REPORTS RESPONSE:", data);

        setReports(data.reports);

        return data;

    } catch (error) {

        console.error(
            "Get all reports error:",
            error.response?.data || error
        );

        throw error;
    }
};

const getresumepdf = async (interviewId) => {
    setLoading(true);

    try {
        const data = await generateresumepdf(interviewId);

        console.log("PDF data:", data);
        console.log("PDF size:", data?.size);
        console.log("PDF type:", data?.type);

        const blob = new Blob([data], {
            type: "application/pdf",
        });

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `resume_${interviewId}.pdf`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        // Clean up the object URL
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Get resume PDF error:", error);
    } finally {
        setLoading(false);
    }
};

    return {
        loading,
        report,
        reports,
        generatereport,
        getreportbyid,
        getallreports,
        getresumepdf
    };
};

    
