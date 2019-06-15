// var io = require('socket.io')(server);

let OuterChatUser = {};
let OuterMessage = {};

let chatApiRealization = (app, mongoose) => {
    let apiPrefix = '/api';

    //  chat 用户模型
    let chatUserModel = new mongoose.Schema({
        nickName: String,
        userName: String,
        passWord: String,
        avatar: String,
        friendsList: Array,
        friendRequest: Array
    })
    let ChatUser = mongoose.model('chatUser', chatUserModel);

    //  chatMessage 消息模型
    let messageModel = new mongoose.Schema({
        bothOwner: String,
        message: Array,
        user1_flag: Number,
        user2_flag: Number
    })
    let Message = mongoose.model('Message', messageModel);

    OuterChatUser.ChatUser = ChatUser;
    OuterMessage.Message = Message;

    const errConsole = (err) => {
        if (err) {
            console.log(err);
        }
    }
    const responseToClient = (res, ans) => {
        res.status(200);
        res.json(ans);
    }
    const getUser = async (name, showPassWord = false) => {
        return await ChatUser.find({userName: name}, showPassWord ? {} : {passWord: 0}, errConsole);
    }

    const chatUserUpdate = async (name, changeObj) => {
        ChatUser.updateOne({userName: name}, changeObj, errConsole);
    }

    const removeItemFromArray = (array, item) => {
        const rank = array.indexOf(item);
        if (rank !== -1) {
            array.splice(rank, 1);
        }
    }

    const getBothOwner = (item1, item2) => {
        return [item1, item2].sort((a, b) => a > b).join('@');
    }

    //  用户添加
    app.post(apiPrefix + '/addChatUser', async function(req,res){
        console.log(req.body, 'body');
        const useYet = await getUser(req.body.userName);
        if (useYet.length !== 0) {
            res.status(200),
            res.json('userName has been used!');
    
        } else {
            let usr = new ChatUser({
                userName: req.body.userName,
                passWord: req.body.passWord,
                nickName: '',
                avatar: '',
                friendsList: [],
                friendRequest: []
            });
            usr.save();
            res.status(200),
            res.json('add user success!')
        }
    });
    
    //  验证密码
    app.post(apiPrefix + '/chatVerify', async function(req,res){
        const userName = req.body.userName;
        const ans = await getUser(userName, true);
        if (ans.length !== 0 && ans[0].passWord === req.body.passWord) {
            res.status(200);
            res.json('verified');
        } else {
            res.status(200);
            res.json('not found');
        }
    });
    //  用户搜索
    app.get(apiPrefix + '/searchName', async function(req,res) {
        const searchTarget = req.query.searchName;
        const ans = await getUser(searchTarget);
        if (ans.length !== 0) {
            console.log(JSON.stringify(ans));
            res.status(200);
            res.json(ans);
        } else {
            res.status(200);
            res.json('not found');
        }
    })

    //  好友申请
    app.get(apiPrefix + '/addFriend', async function(req, res) {
        const targetName = req.query.friendName;
        const i_am = req.cookies.userName;
        const target = await getUser(targetName);
        const friendReq = target[0].friendRequest;
        const friendList = target[0].friendsList;
        if (target.length > 0 && !friendReq.includes(req.cookies.userName) && !friendList.includes(req.cookies.userName)) {
            friendReq.push(req.cookies.userName);
            ChatUser.updateOne({userName: targetName}, {friendRequest: friendReq}, (err, ans) => {
                if (err) {
                    console.log(err);
                } else {
                    responseToClient(res, 'friend request success!');
                }
            });
        } else if (friendList.includes(req.cookies.userName)){
            responseToClient(res, 'already in list');
        } else {
            responseToClient(res, 'friend request success!');
        }
    })

    //  用户信息获取
    app.get(apiPrefix + '/userInfo', async function(req, res) {
        const ans = await getUser(req.cookies.userName);
        if (ans.length !== 0) {
            res.status(200);
            res.json(ans[0]);
        } else {
            res.status(200);
            res.json('not found');
        }
    })

    //  好友添加
    app.get(apiPrefix + '/agreeFriendReq', async function(req, res) {
        const i_am = req.cookies.userName;
        const addFriend = req.query.friendName;
        const ans = await getUser(i_am);
        const targetList = ans[0].friendsList;
        const reqList = ans[0].friendRequest;

        const friend = await getUser(addFriend);
        const friendFriendList = friend[0].friendsList;
        friendFriendList.push(i_am);
        if (ans.length > 0 && !targetList.includes(addFriend)) {
            const targetList = ans[0].friendsList;
            targetList.push(addFriend);
            removeItemFromArray(reqList, addFriend);
            await chatUserUpdate(i_am, {friendsList: targetList, friendRequest: reqList});
            await chatUserUpdate(addFriend, {friendsList: friendFriendList});
            responseToClient(res, 'have a new friend!');
        } else {
            responseToClient(res, 'has friend already!');
        }
    })

    app.get(apiPrefix + '/getAllMessage', async function(req, res) {
        const i_am = req.cookies.userName;
        const regrex = '/^' + i_am + '@|@' + i_am + '$/g';
        const getMessage = await Message.find({'bothOwner':{$regex: eval(regrex)}}, {message:{$slice: -15}});
        responseToClient(res, getMessage);
    })

    app.get(apiPrefix + '/getMoreMessage', async function(req, res) {
        const i_am = req.cookies.userName;
        const bothOwner = getBothOwner(i_am, req.query.toFriend);
        const getNum = req.query.currentLength;
        const moreMessage = await Message.find({'bothOwner': bothOwner}, {message: {$slice: [-1 * getNum - 15, 15]}});
        responseToClient(res, moreMessage[0]);
    })

    console.log('chatApi did mount!');
    return app;
};

module.exports = {
    chatApiRealization,
    ChatUser: OuterChatUser,
    Message: OuterMessage
};