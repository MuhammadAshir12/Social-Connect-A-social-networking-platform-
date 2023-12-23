const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const secretKey = 'secretKey'
const User = require('../models/user')
const Group = require('../models/group')

exports.createGroup = async (req, res) => 
{
    const userId = req.userId
    const groupName = req.body.groupName
    const groupMembers = req.body.groupMembers
    //add userId into groupMembers
    
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

        const group = await Group.create
        ({
            groupName,
            groupMembers,
            createdBy: userId
        })

        await group.save()
        return res.json({success:true, message:"Group created successfully", group})

    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while creating a group"})
    }
}


exports.editGroup = async (req, res)=>
{
    const userId = req.userId
    const groupId = req.params.groupId
    const newName = req.body.newName
    const memberToRemove = req.body.memberToRemove
    const memberToAdd = req.body.memberToAdd

    try
    {
        const group = await Group.findById(groupId)
        if(!group)
        {
            return res.json({success:false, message:"Group not found"})
        }
        if(group.createdBy._id.toString() !== userId)
        {
            return res.json({success:false, message:"You dont have the permission to edit this group"})
        }
        if(newName)
        {
            group.groupName = newName     
        }
        if (memberToAdd && memberToAdd.length > 0) 
        {
            const user = await User.findById(userId);
            if (!user) 
            {
                return res.json({ success: false, message: "User not found" });
            }
            const userFriends = user.friends.map((friendId) => friendId.toString());

            memberToAdd.forEach((memberId) => 
            {
              
                if (!userFriends.includes(memberId.toString())) 
                {
                    return res.json({ success: false, message: "You can only add friends to the group" });
                }
              
                if (!group.groupMembers.includes(memberId.toString())) 
                {
                    group.groupMembers.push(memberId.toString());
                }
            });
        }

        if (memberToRemove && memberToRemove.length > 0) 
        {
            group.groupMembers = group.groupMembers.filter((memberId) => !memberToRemove.includes(memberId.toString()));
        }
        
        await group.save()
        return res.json({success:true, message:"Successfully updated the group"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while aditing the group"})
    }
}


exports.deleteGroup = async (req, res)=>
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

        const group = await Group.findById(groupId)
        if(!group)
        {
            return res.json({success:false, message:"Group not found"})
        }

        if(group.createdBy._id.toString() !== userId)
        {
            return res.json({success:false, message:"You dont have the permission to delte this group"})
        }

        await Group.deleteOne({ _id: groupId })
        return res.json({success:true, message:"Successfully deleted the group"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while deleting the group"})
    }
}



exports.getAllGroups = async (req, res)=>
{
    const userId = req.userId

    try
    {
        const user = await User.findById(userId)
        if(!user)
        {
            return res.json({success:false, messsage:"User not found"})
        }

        const groups = await Group.find({ createdBy: userId });

        
        return res.json({ success: true, groups });

    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, messaage:"An error occured while getting all th groups "})
    }

}
