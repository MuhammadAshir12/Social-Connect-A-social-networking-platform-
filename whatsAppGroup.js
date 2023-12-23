const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const secretKey = 'secretKey'
const User = require('../models/user')
const WhatsAppGroup = require('../models/WhatsAppGroup')
const Message = require('../models/message')


exports.createGroup =async (req, res)=>
{
    const userId = req.userId
    const groupName = req.body.groupName
    const groupMembers = req.body.groupMembers

    try
    {
        const user = await User.findById(userId)
        if (!user) 
        {
            return res.json({ success: false, message: "User not found" })
        }

        const membersNotInFriends = groupMembers.filter(memberId=> !user.friends.includes(memberId))
        if(membersNotInFriends.length > 0)
        {
            return res.json({success:false, message:"One or more group members ar not in your friend list"})
        }
        const newGroup = new WhatsAppGroup
        ({
            groupName,
            groupMembers,
            createdBy: userId,
        })

        newGroup.groupMembers.push(userId)
        await newGroup.save()
        return res.json({success:true, message:"Group created successfully"})
      
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while creating a group"})
    }
}

exports.getGroups = async (req, res) => 
{
    const userId = req.userId
    const groupId = req.params.groupId

    try 
    {
        const user = await User.findById(userId)
        if (!user) 
        {
            return res.json({ success: false, message: "User not found" })
        }

        const group = await WhatsAppGroup.findById(groupId)
        if (!group) 
        {
            return res.json({ success: false, message: "Group not found" })
        }

        if (!group.createdBy.equals(userId)) 
        {
            return res.status(403).json({ success: false, message: "You are not the creator of this group" });
        }

        const messages = await Message.find({ _id: { $in: group.messages } }).populate('sender_id', 'name');

      
        const messagesWithSenderDetails = messages.map(message => 
        ({
            _id: message._id,
            sender: 
            {
                name: message.sender_id.name,
                _id: message.sender_id._id,
            },
            message: message.message,
            createdAt: message.createdAt,
        }));

        return res.json
        ({
            success: true,
            message: "Group details retrieved successfully",
            group: { ...group.toObject(), messages: messagesWithSenderDetails },
        });
    } 
    catch (error) 
    {
        console.error(error);
        return res.json({ success: false, message: "An error occurred while getting the groups" });
    }
};


exports.sendMessage = async (req, res)=> 
{
    const userId = req.userId
    const message = req.body.message
    const groupId = req.body.groupId
    try 
    {
        const user = await User.findById(userId)
        if (!user) 
        {
            return res.json({ success: false, message: "User not found" })
        }
        const sender = await User.findById(req.userId)
        if(!sender)
        {
            return res.json({success:false, message:"Sender not found"})
        }
        if(!groupId)
        {
            return res.json({success:false, message:"No recipients specified."})
        }

        
        const group = await WhatsAppGroup.findOne
        ({
            _id: groupId,
            groupMembers: { $in: [userId] }
        });

        if(!group)
        {
            return res.json({success:false, message:"Group doesnt exist."})
        }

        const receivers = group.groupMembers.filter(member => member.toString() !== userId);

        const newMessage = new Message
        ({
            sender_id: req.userId,
            receiver_Id: receivers,
            message: message,
            isGroupMessage: true
        });

        const savedMessage = await newMessage.save();
        group.messages.push(savedMessage._id);
        await group.save();

            return res.json({ success: true, message: "Message sent to the group successfully" });
    }
    catch (error) 
    {
        console.error(error)
        return res.json({success:false, message: "An error occured while sending message"})
    }
}


exports.deleteGroup = async(req, res)=>
{
    const userId = req.userId
    const groupId = req.params.groupId

    try
    {
        const user = await User.findById(userId)
        if(!user)
        {
            return res.json({success:false, message:"User not found"})
        }

        const group = await WhatsAppGroup.findById(groupId)
        if(!group)
        {
            return res.json({success:false, message:"Group not found"})
        }

        if(group.createdBy._id.toString() !== userId)
        {
            return res.json({success:false, message:"You dont have the permission to delte this group"})
        }

        await WhatsAppGroup.deleteOne({ _id: groupId })
        return res.json({success:true, message:"Successfully deleted the group"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while deleting the group"})
    }
}