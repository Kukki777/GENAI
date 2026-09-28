import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3003",
    withCredentials: true
});


export const generateinterviewreport = async ({
    resume,
    selfdescription,
    jobdescription,
    title
}) => {

    const formdata = new FormData();

    formdata.append("resume", resume);
    formdata.append("selfdescription", selfdescription);
    formdata.append("jobdescription", jobdescription);
    formdata.append("title", title);

    console.log("SENDING:", {
        resume,
        selfdescription,
        jobdescription,
        title
    });

    const res = await api.post(
        "/api/interview/",
        formdata
    );

    console.log("GENERATE RESPONSE:", res.data);

    return res.data;
};


export const interviewewportbyid = async (interviewId) => {

    const res = await api.get(
        `/api/interview/report/${interviewId}`
    );
    return res.data;
};


export const getallinterviewreports = async () => {

    const res = await api.get(
        "/api/interview/reports"
    );

    return res.data;
};

export const generateresumepdf = async (interviewId) => {
    const res = await api.post(
        `/api/interview/resume/pdf/${interviewId}`,
        {},
        {
            responseType: "blob",
        }
    );

    return res.data;
}; 

