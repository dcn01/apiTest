var express=require('express');
var app =express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
let mongoose = require('mongoose');
let ownTool = require('xiaohuli-package');

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
//设置跨域访问
app.all('*', function(req, res, next) {
   res.header("Access-Control-Allow-Origin",  req.headers.origin);
   res.header("Access-Control-Allow-Credentials", "true");
   res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,AccessToken");
   res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
   res.header("X-Powered-By",' 3.2.1');
   res.header("Content-Type", "application/json;charset=utf-8");
   next();
});

// mongoose.connect('mongodb://xiaohuli:u962910@ds257372.mlab.com:57372/wp-api-test',
//   { useNewUrlParser: true });

// mongoose.connect('mongodb://root:root123456@149.129.83.246:27017/admin',
//   { useNewUrlParser: true });

  mongoose.connect('mongodb://xiaohuli:123456@149.129.83.246:27017/test',
  { useNewUrlParser: true });

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log('success!');
});
let animalSchema = new mongoose.Schema({
    name:String,
    type:String
});
let Animal=mongoose.model("Animal",animalSchema);

let dog = new Animal({
    name:"小狗",
    type:"dog",
});
//dog.save();
// Animal.find({'name': '小狗'}, (err, res) => {
//     if (err) {
//         console.log("Error:" + err);
//     } else {
//         console.log("res:" + res);
//     }
// });

//  shore的模型
let flagStore = new mongoose.Schema({
    templateArray: Array,
    preferTemplate: String,
    userName: String,
});
let Store = mongoose.model('Store', flagStore);

//  用户模型
let userModle = new mongoose.Schema({
    userName: String,
    passWord: String
});
let User = mongoose.model('User', userModle);

//   打卡的模型
let attendance = new mongoose.Schema({
    date: String,
    flagArray: Array,
    timeStamp: Number,
    userName: String
})
 
let attendanceRec = mongoose.model('attendanceRec', attendance);

//写个接口123 get请求
app.get('/123', async function(req,res){
    let answer = '';
    console.log(req.query, 'sd');
    await Animal.find({'name': '小狗'}, (err, ans) => {
        if (err) {
            console.log("Error:" + err);
        } else {
            console.log("res:" + ans);
            answer = ans;
        }
    });
    res.status(200),
    res.json(answer)
});

//  拉取最近记录
app.get('/recentRecord', async function(req,res){
    let answer = 'original';
    console.log(req.cookies, 'cookie');
    const oneDatTime = 24*60*60*1000;
    const currentDay = new Date(new Date().toLocaleDateString()).getTime();
    console.log(req.query, 'sd');
    answer = await attendanceRec.find({
        'timeStamp': {$gte: currentDay - 10 * oneDatTime, $lte: currentDay + oneDatTime},
        'userName': req.cookies.userName
    }, 
        (err, ans) => {
        if (err) {
            console.log("Error:" + err);
        }
    });

    res.status(200),
    res.json(answer)
});
//   添加用户
app.post('/addUser', async function(req,res){
    console.log(req.body, 'body');
    const useYet = await User.find({'userName': req.body.userName});
    if (useYet.length !== 0) {
        res.status(200),
        res.json('userName has been used!');

    } else {
        let usr = new User({
            userName: req.body.userName,
            passWord: req.body.passWord
        });
        usr.save();
        res.status(200),
        res.json('add user success!')
    }
});

//  验证密码
app.post('/verify', async function(req,res){
    console.log(req.body, 'body');
    const userName = req.body.userName;
    await User.find({userName: userName}, function(err, goal) {
        if (goal.length !== 0 && goal[0].passWord === req.body.passWord) {
            console.log(JSON.stringify(goal[0]));
            res.status(200);
            res.json('verified');
        } else {
            res.status(200);
            res.json('not found');
        }
    })
});
//   来个post请求
app.post('/addOrUpdateTemplate', async function(req,res){
    console.log(req.body, 'body');
    let store = new Store({
        preferTemplate: req.body.preferTemplate,
        templateArray: req.body.templateArray,
        userName: req.cookies.userName
    });
    const ans = await Store.find({'userName': req.cookies.userName}, (err, ans) => {
        if(err) {
            console.log(err);
        }
    });
    if(ans.length > 0) {
        Store.updateOne({'userName': req.cookies.userName},
        {
            preferTemplate: req.body.preferTemplate,
            templateArray: req.body.templateArray
        },
        (err, ans) => {
            if(err) {
                console.log(err);
            } else {
                console.log(ans, 'update');
                res.status(200),
                res.json('update');
            }
        })
    } else {
        store.save();
        res.status(200),
        res.json('ok')
    }
});

//  打卡接口,创建或更新
app.post('/attendance', async function(req,res){
    console.log(req.body, 'body');
    let store = new attendanceRec({
        flagArray: req.body.ansArray,
        date: req.body.date,
        timeStamp: new Date().getTime(),
        userName: req.cookies.userName
    });
    const now = ownTool.getYearMonthDate();
    const ans = await attendanceRec.find({'date': now}, (err, ans) => {
        if(err) {
            console.log(err);
        }
    });
    if(ans.length > 0) {
        attendanceRec.updateOne({date: now}, {flagArray: req.body.ansArray}, (err, ans) => {
            if(err) {
                console.log(err);
            } else {
                console.log('update');
                res.status(200),
                res.json('update');
            }
        })
    } else {
        store.save();
        res.status(200),
        res.json('ok')
    }
});

app.post('/readTemplate', async function(req,res){
    console.log(req.body, 'body');
    const templateName = req.body.templateName;
    let ans = 'xxx';
    await Store.find({'userName': req.cookies.userName}, function(err, goal) {
        if (goal.length !== 0) {
            console.log(JSON.stringify(goal[0]));
            ans = goal[0];
            res.status(200);
            res.json(ans);
        } else {
            res.status(200);
            res.json('not found');
        }
    })
});
 
//配置服务端口
 
let PORT = process.env.PORT || 3000;
var server = app.listen(PORT, function () {
 
    var host = server.address().address;
 
    var port = server.address().port;
    console.log('open success')
 
    console.log('Example app listening at http://%s:%s', host, port);
})
