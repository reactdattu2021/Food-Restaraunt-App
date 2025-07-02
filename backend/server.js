import express from 'express'
import cors from 'cors';
import 'dotenv/config'
// import { json } from "body-parser";
 const app=express();
 const port=process.env.Port ||4000;
//  middle wares
app.use(cors());
app.use(express.json());
app.listen(port,()=>{
    console.log('server started on port number 4000')
})