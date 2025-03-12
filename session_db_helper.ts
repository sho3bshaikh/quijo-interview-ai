import { ObjectId } from "mongodb";

export async function checkValidSessin(sessionId: string,db:any): Promise<boolean> {
    try {
      const result = await db.collection("interview").findOne({ _id: new ObjectId(sessionId) });
      return result !== null;
    } catch (err) {
      console.error('Error checking session:', err);
      return false;
    }
  }
  export async function getInterview(sessionId: string,db:any): Promise<any> {
    try {
      return await db.collection("interview").findOne({ _id: new ObjectId(sessionId) });
    } catch (err) {
      console.error('Error getting interview:', err);
      return null;
    }
  }
  export async function getJD( id: string,db:any): Promise<any> {
    try {
      return await db.collection("jd").findOne({_id:new ObjectId(id)});}
    catch (err) {
      console.error('Error getting JD:', err);
      return null;
    }
  }
  export async function getCV( id: string,db:any): Promise<any> {
    try {
      return await db.collection("cvs").findOne({_id:new ObjectId(id)});}
    catch (err) {
      console.error('Error getting JD:', err);
      return null;
    }
  }
// Initialize Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
//   // Generate interview questions using Gemini
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.0-flash"
//   });

//   const chatSession = model.startChat({
//     generationConfig: {
//       temperature: 1,
//       topP: 0.95,
//       topK: 40,
//       maxOutputTokens: 8192,
//       responseMimeType: "application/json",
//       responseSchema: {
//         type: "object",
//         properties: {
//           questions: {
//             type: "array",
//             items: {
//               type: "string"
//             }
//           }
//         }
//       }
//     },
 
//   });

//   try {
//     const result = await chatSession.sendMessage(`
// Job Description:
//           ${jd.description}
          
//           CV:
//           ${JSON.stringify(cv)}
          
//           Please provide 10 specific interview questions that assess the candidate's fit for this role.
// `);
//     const questions = result.response.text();
//     console.log("Generated questions:", JSON.parse(questions).questions);
    
//     // Store questions in the interview document
//     await db.collection("interview").updateOne(
//       { _id: new ObjectId(url.searchParams.get('sessionId')) },
//       { $set: { questions: questions } }
//     );
//   } catch (error) {
//     console.error("Error generating questions:", error);
//   }