let socketServer = (io, Message) => {
    // socket.io 相关配置

    let userMap = {};

    const getMesCollection = async (searchKey) => {
        return await Message.find({bothOwner: searchKey}, errConsole);
    }
    const errConsole = (err) => {
        if (err) {
            console.log(err);
        }
    }
    const getBothOwner = (item1, item2) => {
        return [item1, item2].sort((a, b) => a > b).join('@');
    }
    const isFirst = (bothName, name) => bothName.indexOf(name) === 0;

    io.on('connection', function(socket){
        console.log('a user connected');
        //监听客户端的消息

        //  发送消息，并同步消息状态
        socket.on('chat message', async function(toUser, owner, msg){
            const bothOwn = getBothOwner(toUser, owner);
            const useFlagOne = isFirst(bothOwn, owner);
            const mesCollection = await getMesCollection(bothOwn);
            if (mesCollection.length === 0) {
                let mesCol = new Message({
                    bothOwner: bothOwn,
                    user1_flag: useFlagOne ? 1 : 0,
                    user2_flag: useFlagOne ? 0 : 1,
                    message: [{
                        owner: owner,
                        content: msg,
                        timeStamp: new Date().valueOf(),
                    }]
                })
                mesCol.save()
            } else {
                const mesLength = mesCollection[0].message.length;
                let updateObj = Object.assign({'$push': {message: {
                    owner: owner,
                    content: msg,
                    timeStamp: new Date().valueOf(),
                }}}, useFlagOne ? {user1_flag: mesLength + 1} : { user2_flag: mesLength + 1});
                Message.updateOne({bothOwner: bothOwn}, updateObj, errConsole);
            }

            //  一对一传输
            let targetId = userMap[toUser];
            targetId && io.to(`${targetId}`).emit('chat message', {owner: owner, message: msg});
        });

        //  登记socket.id
        socket.on('register', function(userID) {
            userMap[userID] = socket.id;
            console.log(userMap, 'register success!');
        })
        //  同步聊天中消息状态同步
        socket.on('updateMessRank', async function(owner, toUser) {
            const bothOwn = getBothOwner(toUser, owner);
            const mesCollection = await getMesCollection(bothOwn);
            const mesLength = mesCollection[0].message.length;
            let updateObj = isFirst(bothOwn, owner) ? {user1_flag: mesLength} : { user2_flag: mesLength};
            Message.updateOne({bothOwner: bothOwn}, updateObj, errConsole);
        })
        //  下线移除socket.id
        socket.on('disconnect', function(){
            const removeUser = Object.keys(userMap).find(item => userMap[item] === socket.id);
            delete userMap[removeUser];
            console.log('user disconnected', removeUser, socket.id);
        });
    });
}

module.exports = socketServer;