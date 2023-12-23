const express =  require('express')
const router = express.Router()


exports.handleUpload=async (req,res,next)=>
{
    try
    {
        if(!req.file)
        {
            return res.status(400).json({error: "No file uploaded"})
        }
        const { fieldname } = req.file;
        console.log('Field Name:', fieldname);
      
        return res.status(200).json({message:"File uploaded successfully"})

    }
    catch(error)
    {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' });
    }
}