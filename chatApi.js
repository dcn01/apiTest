// var io = require('socket.io')(server);
let fs = require('fs');

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
        const i_am = req.query.userName;
        const target = await getUser(targetName);
        const { avatar, nickName, userName, friendsList } = (await getUser(i_am))[0];
        const friendReq = target[0].friendRequest;
        const notInFriendsReqList = friendReq.findIndex(item => item.userName === i_am) === -1;
        if (target.length > 0 && notInFriendsReqList) {
            friendReq.push({avatar, nickName, userName, friendsList});
            ChatUser.updateOne({userName: targetName}, {friendRequest: friendReq}, (err, ans) => {
                if (err) {
                    console.log(err);
                } else {
                    responseToClient(res, 'friend request success!');
                }
            });
        } else {
            responseToClient(res, 'A friend request has been sent');
        }
    })

    //  用户信息获取
    app.get(apiPrefix + '/userInfo', async function(req, res) {
        const ans = await getUser(req.query.userName);
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
        const i_am = req.query.userName;
        const addFriend = req.query.friendName;
        const ans = await getUser(i_am);
        const friend = await getUser(addFriend);

        if (ans.length > 0) {
            //  去除一个申请
            ChatUser.updateOne({userName: i_am}, {$pull: { friendRequest: {userName: addFriend} }}, errConsole);
            //  如果自己没有该好友，自己也更新
            if (ans[0].friendsList.findIndex(item => item.userName === addFriend) === -1) {
                ChatUser.updateOne({ userName: i_am}, {
                    //  更新自己的好友列表
                    $push: { friendsList: { userName: addFriend, nickName: friend[0].nickName, avatar: friend[0].avatar}}
                }, errConsole);
            }
            //  好友的好友列表信息更新,前提是好友没有你
            if (friend[0].friendsList.findIndex(item => item.userName === i_am) === -1) {
                ChatUser.updateOne({ userName: addFriend}, {
                    //  更新好友的好友列表
                    $push: { friendsList: { userName: i_am, nickName: ans[0].nickName, avatar: ans[0].avatar}}
                }, errConsole);
            }
            responseToClient(res, 'have a new friend!');
        }
    })

    //  更新用户资料
    app.post(apiPrefix + '/updateUserInfo', async function(req,res) {
        const i_am = req.body.userName;
        let transferObj = req.body.changeObj;
        const key = Object.keys(transferObj)[0];
        if (key === 'avatar') {
            const imgName = i_am + '_avatar'
            var path = '../chat/dist/avatar/'+ imgName +'.png';//从app.js级开始找--在我的项目工程里是这样的
            var base64 = transferObj.avatar.replace(/^data:image\/\w+;base64,/, "");//去掉图片base64码前面部分data:image/png;base64
            var dataBuffer = new Buffer(base64, 'base64'); //把base64码转成buffer对象，
            fs.writeFile(path,dataBuffer,function(err){//用fs写入文件
                if(err){
                    console.log(err);
                }else{
                    console.log('写入成功！');
                }
            })
            const imgUrl = (process.argv.includes('local') ? 'http://localhost:3001/avatar/' : 'http://149.129.83.246/avatar/') + imgName + '.png';
            transferObj = {avatar: imgUrl}
        }
        if (key === 'fridendNickName') {
            const { newNickName, friend } = transferObj.fridendNickName;
            //  先找到自己是谁，然后查找朋友列表中用户名是朋友的那个，然后再更改第一个的昵称
            ChatUser.find({ userName: i_am}).updateOne({'friendsList.userName': friend}, {$set:{'friendsList.$.nickName': newNickName}}, errConsole);
        } else if (key === 'delete') {
            const changeObj = {};
            changeObj[transferObj.delete.key] = {userName: transferObj.delete.value};
            ChatUser.updateOne({ userName: i_am}, {$pull: changeObj}, errConsole);
        } else {
            chatUserUpdate(i_am, transferObj);
        }
        responseToClient(res, 'success');
    })

    app.get(apiPrefix + '/getAllMessage', async function(req, res) {
        const i_am = req.query.userName;
        const regrex = '/^' + i_am + '@|@' + i_am + '$/g';
        const getMessage = await Message.find({'bothOwner':{$regex: eval(regrex)}}, {message:{$slice: -15}});
        responseToClient(res, getMessage);
    })

    app.get(apiPrefix + '/getMoreMessage', async function(req, res) {
        const i_am = req.query.userName;
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