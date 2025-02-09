const express = require('express')
const mysql = require('mysql2')
const path = require('path')
const static = require('serve-static')
const dbconfig = require('./config/dbconfig.json')
const session = require('express-session')
const bcrypt = require('bcrypt');
const saltRounds = 10;
//author : YangSueHyuck

const pool = mysql.createPool({
    connectionLimit: 20,
    host: dbconfig.host,
    user: dbconfig.user,
    password: dbconfig.password,
    database: dbconfig.database,
    debug: false
})

const app = express()
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use('/public', static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));


app.post('/process/login', (req, res) => {
    console.log('/process/login 호출됨');

    const paramId = req.body.id;
    const paramPassword = req.body.password;

    console.log('로그인 요청: ID:', paramId);

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('❌ MySQL 연결 실패:', err.message);
            res.status(500).json({ error: "데이터베이스 연결 실패" });
            return;
        }

        const query = "SELECT nickname, password, coin FROM gamblers WHERE id = ?";
        conn.query(query, [paramId], (err, rows) => {
            conn.release();
            if (err) {
                console.error('❌ SQL 실행 실패:', err);
                res.status(500).json({ error: "SQL 실행 실패" });
                return;
            }

            if (rows.length === 0) {
                console.log('❌ 사용자 없음');
                res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });
                return;
            }

            const storedHashedPassword = rows[0].password; // 저장된 해시된 비밀번호
            const nickname = rows[0].nickname;
            const coin = rows[0].coin;

            bcrypt.compare(paramPassword, storedHashedPassword, (err, isMatch) => {
                if (err) {
                    console.error('❌ 비밀번호 비교 중 오류:', err);
                    res.status(500).json({ error: "비밀번호 비교 오류" });
                    return;
                }

                if (!isMatch) {
                    console.log('❌ 비밀번호 불일치');
                    res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });
                    return;
                }

                console.log('✅ 로그인 성공!');
                req.session.user = { id: paramId, nickname, coin };

                res.redirect('/public/main.html');
            });
        });
    });
});


// app.post('/process/login',(req,res)=>{
//     console.log('/process/login 호출됨 '+ req)

//     const paramId = req.body.id;
//     const paramPassword = req.body.password;

//     console.log('로그인 요청됨 \n Id : '+ paramId + '\npassword : '+ paramPassword);

//     pool.getConnection((err, conn)=>{
//         if (err) {
//             console.log('Mysql getConnection error. aborted')
//             console.error('❌ MySQL 연결 실패:', err.message);
//             res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
//             res.write('<h1>데이터베이스 연결 실패</h1>')
//             res.end();
//             return;
//         }


//         const exec = conn.query("select `nickname`, `coin` from `gamblers` where `id` = ? and `password` = ?",
//             [paramId,bcrypt.hash(paramPassword)],
//             (err,rows) => {
//                 conn.release();
//                 console.log('실행된 SQL 쿼리 : '+ exec.sql);

//                 if (err) {
//                     console.dir(err)
//                     res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
//                     res.write('<h1>SQL query 실행 실패</h1>')
//                     res.end();
//                     return;
//                 }

//                 if (rows.length > 0) {
//                     console.log('Id 와 password가 일치하는 user found. nickname %s coin %s ',rows[0].nickname,rows[0].coin);
//                     req.session.user = {
//                         id: paramId,
//                         nickname: rows[0].nickname,
//                         coin: rows[0].coin
//                     };

//                     res.redirect('/public/main.html');
//                     return;
//                 }

//                 else {
//                     console.log('Id 와 password가 일치하는 user unfound.');
//                     res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
//                     res.write('<h2>사용자 로그인 실패. 아이디와 패스워드를 확인하세요.</h2>')
//                     res.end();
//                     return;
//                 }
//             }
//         )
//     })


// })









app.post('/process/adduser',(req, res)=>{
    console.log('/process/adduser 호출됨 '+ req)

    const paramNickname = req.body.nickname;
    const paramId = req.body.id;
    const paramPassword = req.body.password;

    console.log(paramNickname)
    console.log(paramId)
    console.log(paramPassword)
    

    bcrypt.hash(paramPassword, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error('❌ 비밀번호 해싱 실패:', err);
            res.status(500).json({ error: "비밀번호 해싱 중 오류 발생" });
            return;
        }



        pool.getConnection((err, conn) => {
            if (err) {
                console.log('Mysql getConnection error. aborted')
                console.error('❌ MySQL 연결 실패:', err.message);
                res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                res.write('<h1>데이터베이스 연결 실패</h1>')
                res.end();
                return;
            }

            console.log('데이터베이스와의 연결선을 확보했습니다.')

            const exec = conn.query('insert into gamblers (nickname, id, password, coin) values (?,?,?,?)',
                [paramNickname, paramId, hashedPassword, 1000],
                
                (err, result)=>{
                    conn.release();
                    console.log('실행된 SQL :'+exec.sql)

                    if (err) {
                        console.log('SQL 실행시 오류 발생')
                        console.dir(err);
                        res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                        res.write('<h1>SQL query 실행 실패\n nickname 혹은 id가 중복되셨습니다.</h1>')
                        res.end();
                        return;
                    }

                    if (result) {
                        console.dir(result)
                        console.log('Inserted 성공')
                        res.redirect('/public/index.html');
                    }
                    else {
                        console.log('Inserted 실패')

                        res.writeHead('200',{'Content-Type':'text/html; charset=utf8'})
                        res.write('<h1>사용자 추가 실패</h1>')
                        res.end();
                    }
                })
        });

    })


});




app.get('/process/getUserInfo', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.json({ id: null });
    }
});



app.post('/process/updateCoin', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    const userId = req.session.user.id;
    const newCoin = req.body.coin;

    pool.getConnection((err, conn) => {
        if (err) {
            res.status(500).send("DB 연결 실패");
            return;
        }

        const query = "UPDATE gamblers SET coin = ? WHERE id = ?";
        conn.query(query, [newCoin, userId], (err, result) => {
            conn.release();
            if (err) {
                res.status(500).send("코인 업데이트 실패");
            } else {
                res.json({ success: true, coin: newCoin });
            }
        });
    });
});



app.get('/process/getRanking', (req, res) => {
    pool.getConnection((err, conn) => {
        if (err) {
            res.status(500).send("DB 연결 실패");
            return;
        }

        const query = "SELECT nickname, coin FROM gamblers ORDER BY CAST(coin AS UNSIGNED) DESC LIMIT 10";
        conn.query(query, (err, results) => {
            conn.release();
            if (err) {
                res.status(500).send("랭킹 조회 실패");
            } else {
                res.json(results);
            }
        });
    });
});








app.listen(3000, ()=> {
    console.log('Listening on port 3000')
})