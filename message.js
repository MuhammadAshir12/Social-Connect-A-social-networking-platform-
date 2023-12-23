const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const secretKey = 'secretKey'
const User = require('../models/user')
const Message = require('../models/message')
const Group = require('../models/group')
const WhatsAppGroup = require('../models/WhatsAppGroup')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })



exports.getMessage = async (req, res) => 
{
    const receiver_Id = req.params.receiver_Id
    const sender_Id = req.userId

    try 
    {
        const user = await User.findById(receiver_Id)
        if (!user) 
        {
            return res.json({ success: false, message: "Receiver not found" })
        }
        const messages = await Message.find
        ({
            $or: 
            [
                { sender_id: sender_Id, receiver_Id: receiver_Id },
                { sender_id: receiver_Id, receiver_Id: sender_Id },
            ],
        }).sort({ createdAt: 1 })

        const formatMessage = await Promise.all(messages.map(async (message) => {
            const repliedMessage = await Message.findOne({ _id: message.repliedTo });
            const formatRepiedTo = message.repliedTo ?
            {
                "messageId" : message.repliedTo,
                "senderId" : repliedMessage.sender_id,
                "receiverId" : repliedMessage.receiver_Id,
                "message" : repliedMessage.message,
                "createdAt" : repliedMessage.createdAt,
                "updatedAt" : repliedMessage.updatedAt,
            } : null

            return {
                "_id" : message._id,
                "sender_id" : message.sender_id,
                "receiver_Id" : message.receiver_Id,
                "message" : message.message,
                "repliedTo" : formatRepiedTo,
                "createdAt" : message.createdAt,
                "updatedAt" : message.updatedAt,
            }
        }))
        return res.status(200).json({ success: true, messages: formatMessage })
    } 
    catch (error) 
    {
        console.error(error)
        return res.json({ success: false, message: "An error occurred while fetching messages" })
    }
}

exports.sendBroadCastMessage = async (req, res) => 
{
    const sender_id = req.userId
    const messageText = req.body.message

    try
    {
        const sender = await User.findById(sender_id)
        if(!sender)
        {
            return res.json({success:false, message:"Sender not found"})
        }

        senderFriends = sender.friends
        const friendOfUsers = await User.find({_id: {$in: senderFriends}})
        const broadcastMessages = friendOfUsers.map(async (user) => 
        {
            const newMessage = new Message({
                sender_id: sender_id,
                receiver_Id: user._id,
                message: messageText,
            });
            return await newMessage.save()
        })
        await Promise.all(broadcastMessages)
        return res.json({success:true, message:"Broadcast message sent successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false,message:"An error occured while sending broadcast message to friends"})
    }
}


exports.groupBroadcastMessage = async (req, res) => 
{
    const senderId = req.userId
    const messageText = req.body.message
    const groupId = req.body.groupId

    try 
    {
        const sender = await User.findById(senderId)
        if (!sender) 
        {
            return res.json({ success: false, message: "Sender not found" })
        }

        const group = await Group.findById(groupId)
        if (group.createdBy.toString() !== senderId) 
        {
            return res.json({ success: false, message: "You don't have permission to send broadcast messages to this group" })
        }

        const broadcastMessages = group.groupMembers.map(async (memberId) => 
        {
            const newMessage = new Message
            ({
                sender_id: senderId,
                receiver_Id: memberId,
                message: messageText,
            })
            return await newMessage.save()
        })

        await Promise.all(broadcastMessages)

        return res.json({ success: true, message: "Broadcast message sent successfully" })
    } 
    catch (error) 
    {
        console.error(error);
        return res.json({ success: false, message: "An error occurred while sending the broadcast message" })
    }
}


exports.editMessage = async (req, res)=>
{
    const userId = req.userId
    const messageId = req.params.messageId

    try
    {
        const message = await Message.findById(messageId)
        if(!message)
        {
            return res.json({success:false, message:"Message not found"})
        }
        if(message.sender_id.toString() !== userId)
        {
            return res.json({success:false, message:"You are not authorized to edit this message"})
        }
        message.message = req.body.message
        await message.save()

        return res.json({success:true, message:"Message edited successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured wile editing the message"})
    }
}



exports.unsendMessage = async (req, res)=>
{
    const userId = req.userId
    const messageId = req.params.messageId

    try
    {
        const message = await Message.findById(messageId)
        if (!message)
        {
            return res.json({success:false, message:"Message not found"})
        }
        if (message.sender_id.toString() !== userId)
        {
            return res.json({success:false, message:"You are not authroized to unsend this message"})
        }

        await Message.findByIdAndDelete(messageId)
        return res.json({success:true, message:"Message unsent successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while unsending the message"})
    }
}



exports.replyToSpecificMessage = async (req, res) => 
{
    const userId = req.userId
    const messageId = req.params.messageId
    const replyText = req.body.replyText

    try 
    {
        const originalMessage = await Message.findById(messageId);

        if (!originalMessage) 
        {
            return res.json({ success: false, message: "Message not found" })
        }

        const validExchange = await Message.exists
        ({
            $or: 
            [
                { sender_id: userId, receiver_Id: originalMessage.sender_id },
                { sender_id: originalMessage.sender_id, receiver_Id: userId },
            ],
        })

        if (!validExchange) 
        {
            return res.json({ success: false, message: "You cannot reply to this message" })
        }

        const replyMessage = new Message
        ({
            sender_id: userId,
            receiver_Id: originalMessage.sender_id,
            message: replyText,
            repliedTo: messageId,
        })

        await replyMessage.save()
        return res.json({ success: true, message: "Reply sent successfully" })
    } 
    catch (error) 
    {
        console.error(error)
        return res.json({ success: false, message: "An error occurred while replying" })
    }
}




exports.oneToOne = async (req, res) => 
{
    const userId = req.userId
    const message = req.body.message
    const receiver_Id = req.body.receiver_Id 
    console.log(req.body)

    try 
    {
        const sender = await User.findById(userId)
        if (!sender) 
        {
            return res.json({ success: false, message: "Sender not found" })
        }
        const receiver = await User.findById(receiver_Id)
        if (!receiver) 
        {
            console.log("Receiver ID:", receiver_Id)
            return res.json({ success: false, message: "Receiver not found" })
        }
        const recievers=[receiver_Id]
        if(!receiver.friends.includes(userId))
        {
            return res.json({success:false, message:"Receiver is not a friend of user"})
        }
        if (!req.file) 
        {
            return res.json({ success: false, message: "No file uploaded" })
        }
      
        const fileType = req.file.mimetype.split('/')[0]
        const fileUrl = `http://localhost:8080/${req.file.path.replace(/\\/g, "/")}`
        
        const newMessage = new Message
        ({
            sender_id: userId,
            receiver_Id: receiver_Id, 
            message: message,
            isGroupMessage: false,
            attachment: 
            {
                fileType,
                fileUrl,
            },
        })
        const savedMessage = await newMessage.save()
        console.log(savedMessage)
        return res.json({ success: true, message: "One-to-one message sent successfully" })
    } 
    catch (error) 
    {
        console.error(error)
        return res.json({ success: false, message: "An error occurred while sending the message" })
    }
}
