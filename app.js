var express=require('express');
var app =express();
var bodyParser = require('body-parser');
let mongoose = require('mongoose');

app.use(bodyParser.json())
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

mongoose.connect('mongodb://xiaohuli:u962910@ds257372.mlab.com:57372/wp-api-test',
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
// dog.save();
Animal.find({'name': '小狗'}, (err, res) => {
    if (err) {
        console.log("Error:" + err);
    } else {
        console.log("res:" + res);
    }
});

//  shore的模型
let flagStore = new mongoose.Schema({
    flagArray: Array,
    templateName: String
});
let Store = mongoose.model('Store', flagStore);

//   打卡的模型
let attendance = new mongoose.Schema({
    date: String,
    flagArray: Array,
    timeStamp: Number
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

//  判断是否打卡
app.get('/isMarked', async function(req,res){
    let answer = '';
    console.log(req.query, new Date().toLocaleDateString().replace(/-/g, '/'),'sd');
    await attendanceRec.find({'date': new Date().toLocaleDateString().replace(/-/g, '/')}, (err, ans) => {
        if (err) {
            console.log("Error:" + err);
        } else {
            console.log("res:" + ans);
            answer = ans;
            if(answer) {
                res.status(200),
                res.json(answer)
            } else {
                res.status(200),
                res.json();
            }
        }
    });
    // res.status(200),
    // res.json(answer)
});

//  拉取最近记录
app.get('/recentRecord', async function(req,res){
    let answer = 'original';
    const oneDatTime = 24*60*60*1000;
    const currentDay = new Date(new Date().toLocaleDateString()).getTime();
    console.log(req.query, 'sd');
    answer = await attendanceRec.find({'timeStamp': {$gte: currentDay - 10 * oneDatTime, $lte: currentDay + oneDatTime}}, (err, ans) => {
        if (err) {
            console.log("Error:" + err);
        }
    });

    res.status(200),
    res.json(answer)
});
//   来个post请求
app.post('/addTemplate', async function(req,res){
    console.log(req.body, 'body');
    let store = new Store({
        flagArray: req.body.flagArray,
        templateName: req.body.templateName
    });
    store.save();
    res.status(200),
    res.json('')
});

//  打卡接口,创建或更新
app.post('/attendance', async function(req,res){
    console.log(req.body, 'body');
    let store = new attendanceRec({
        flagArray: req.body.ansArray,
        date: req.body.date,
        timeStamp: new Date().getTime()
    });
    const now = new Date().toLocaleDateString().replace(/-/g, '/');
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
    await Store.find({templateName: templateName}, function(err, goal) {
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
