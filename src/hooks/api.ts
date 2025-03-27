// Get Enroll/Predict/Delete Result

export const getResultFromSessionToken = async (sessionToken:string)=>{

    const resultData = await fetch(`https://api-orchestration-uatv3.privateid.com/v2/verification-session/${sessionToken}/webhook`);

    return resultData;
}