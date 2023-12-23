const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const saltrounds = 10
const secretKey = 'secretKey'
const User = require('../models/user')



const validSignupInput =  (data)=>
{
    const {name, email, password} = data
    if (!/^[A-Za-z]+$/.test(name)) 
    {
        return {success:false, message:"Name can only contain alphabets"}
    }
    if (!validateEmail(email)) 
    {
        return {success: false, message: "Invalid email"}
    }
    if (password.length < 8) 
    {
        return { success: false, message: "Password must be at least 8 characters long" };
    }
    else 
    {
        return { success: true }
    }
}
const validateEmail = (email) => 
{
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


exports.userSignup = async(req, res)=>
{
    console.log(req.body)
    const isValid = validSignupInput(req.body)

    if (!isValid.success) 
    {
        res.json({ success: false, message: isValid.message })
        return
    }

    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    
    if(!name || !email || !password)
    {
        return res.json({success:false, message:"You have inserted null values"})
    }

    const user = await User.findOne({email})
    if(user)
    {
        return res.json({success:false, message:"User with this email already exists"})
    }

    const hashedPassword = await bcrypt.hash(password, saltrounds)
    try
    {
        const newUser = await User.create({name, email, password:hashedPassword})
        return res.json({success:true, message:"You have successfully signed up"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured during signup"})
    }
}



exports.userLogin = async (req,res) =>
{
    const email = req.body.email
    const password = req.body.password

    if(!email || !password)
    {
        res.json({success:false, message:"Please enter email and password"})
        return
    }

    const user = await User.findOne({email})
    if(!user)
    {
        return res.json({success: false, message:"No account found having this email"})
    }

    const isEqual = await bcrypt.compare(password, user.password)
    if(!isEqual)
    {
        return res.json({success:false, message:"Wrong password"})
    }

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    return res.json({ success: true, userId: user._id, name: user.name,  token: token});
}


exports.getAllUsers = async (req, res)=>
{
    const userId = req.userId

    try
    {
        const user = await User.findById(userId)
        if(!user)
        {
            return res.json({success:false, message:"User not found"})
        }
        const allUsers = await User.find()
        return res.json({success:true, users:allUsers})
    }
    catch(error)
    {
        console.error(error)
        {
            return res.json({success:false, message:"An error occured while getting all users"})
        }
    }
}

exports.sendFriendRequest = async (req, res)=>
{
    const sender_id = req.userId
    const receiver_Id = req.params.receiver_Id
    try
    {
        const receiver = await User.findById(receiver_Id)
        if(!receiver)
        {
            return res.json({success:false, message:"Receiver not found"})
        }

        const sender = await User.findById(sender_id)
        if (!sender)
        {
            return res.json({success:false, message:"Sender not found"})
        }
        if (receiver.friendRequests.includes(sender_id))
        {
            return res.json({success:false, message:"Friend request already send"})
        }
        if(receiver.friends.includes(sender_id))
        {
            return res.json({success:false, message:"You are already friends"})
        }
        if(sender_id.toString() === receiver_Id)
        {
            return res.json({success:false, message:"You cannot send friend request to youself"})
        }
        if(sender.friendRequests.includes(receiver_Id))
        {
            return res.json({success:false, message:"Friend request already received"})
        }

        receiver.friendRequests.push(sender_id)
        await receiver.save()

        return res.json({success:true, message:"Friend request sent successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, messsage:"An error occured while sending the friend request"})
    }
}

exports.getFriendRequest = async (req, res)=>
{
    const loggedInUser = req.userId

    try
    {
        const user = await User.findById(loggedInUser)
        if(!user)
        {
            return res.json({success:false, message:"User not found"})
        }
        const friendRequests = await User.find({_id: {$in: user.friendRequests}}, 'name _id')

        return res.json({success:true, friendRequests:friendRequests})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while getting all the requests"})
    }
}


exports.acceptFriendRequest = async (req, res)=>
{
    const loggedInUserId = req.userId
    const userIdToAccept = req.params.userIdToAccept

    try
    {
        const loggedInUser = await User.findById(loggedInUserId)
        if(!loggedInUser)
        {
            return res.json({success:false, message:"Logged in user not found"})
        }

        const userToAccept = await User.findById(userIdToAccept)
        if(!userToAccept)
        {
            return res.json({success:false, message:"User to accept not found"})
        }

        loggedInUser.friendRequests = loggedInUser.friendRequests.filter((friendsId)=>friendsId.toString() !== userIdToAccept)
        loggedInUser.friends.push(userIdToAccept)

        userToAccept.friendRequests = userToAccept.friendRequests.filter((friendsId)=>friendsId.toString() !== loggedInUser)
        userToAccept.friends.push(loggedInUserId)

        await loggedInUser.save()
        await userToAccept.save()

        return res.json({success:true, message:"Friend request accepted"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while acccepting the request"})
    }
}


exports.rejectFriendRequest = async (req, res) =>
{
    const loggedInUserId = req.userId
    const userIdToReject = req.params.userIdToReject

    try
    {
        const loggedInUser = await User.findById(loggedInUserId)
        if(!loggedInUser)
        {
            return res.json({success:false, message:"Logged in user not found"})
        }

        const userToReject = await User.findById(userIdToReject)
        if(!userToReject)
        {
            return res.json({success:false, message:"User to rejct not found"})
        }

        if(!loggedInUser.friendRequests.includes(userIdToReject))
        {
            return res.json({success:false, message:"Friend request not found"})
        }

        loggedInUser.friendRequests = loggedInUser.friendRequests.filter((friendsId)=> friendsId.toString() !== userIdToReject)
        await loggedInUser.save()

        return res.json({success:true, message:"Friend request rejected successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while rejecting friend request"})
    }
}


exports.unfriend = async (req, res)=>
{
    const loggedInUserId = req.userId
    const friendIdToRemove = req.params.friendIdToRemove

    try
    {
        const loggedInUser = await User.findById(loggedInUserId)
        if(!loggedInUser)
        {
            return res.json({success:false, message:"Logged in user not found"})
        }
        const friendToRemove = await User.findById(friendIdToRemove)
        if(!friendToRemove)
        {
            return res.json({success:false, message:"Friend to remove not found"})
        }
        if(!loggedInUser.friends.includes(friendIdToRemove))
        {
            return res.json({success:false, message:"friend not found in your friend list"})
        }

        loggedInUser.friends = loggedInUser.friends.filter((friendsId)=> friendsId.toString() !== friendIdToRemove)
        await loggedInUser.save()

        friendToRemove.friends = friendToRemove.friends.filter((friendsId)=>friendsId.toString() !== loggedInUserId)
        await friendToRemove.save()

        return res.json({success:true, message:"unfriend successfully"})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while removing friend"})
    }
}

exports.getAllFriends = async (req, res)=>
{
    const loggedInUser = req.userId

    try
    {
        const user = await User.findById(loggedInUser)
        if(!user)
        {
            return res.json({success:false, message:"User not found"})
        }
        const friends = await User.find({_id: {$in: user.friends}}, 'name _id')
        return res.json({success:true, friends:friends})
    }
    catch(error)
    {
        console.error(error)
        return res.json({success:false, message:"An error occured while getting all the requests"})
    }
}