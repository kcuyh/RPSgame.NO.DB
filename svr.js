const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const static = require('serve-static');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

const DATA_FILE = path.join(__dirname, 'users.json');  // 데이터 저장 파일

// 파일에서 사용자 데이터 로드하는 함수
function loadUsers() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));  // 파일 없으면 초기화
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// 사용자 데이터 저장하는 함수
function saveUsers(users) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// 🔹 회원가입 처리
app.post('/process/adduser', (req, res) => {
    const users = loadUsers();
    const { nickname, id, password } = req.body;

    if (users.some(user => user.id === id)) {
        return res.status(400).json({ error: "이미 존재하는 ID입니다." });
    }

    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: "비밀번호 해싱 오류" });

        const newUser = { id, nickname, password: hashedPassword, coin: 1000 };
        users.push(newUser);
        saveUsers(users);

        res.redirect('/public/index.html');
    });
});

// 🔹 로그인 처리
app.post('/process/login', (req, res) => {
    const users = loadUsers();
    const { id, password } = req.body;

    const user = users.find(user => user.id === id);
    if (!user) {
        return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ error: "비밀번호 비교 오류" });
        if (!isMatch) {
            return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });
        }

        req.session.user = { id: user.id, nickname: user.nickname, coin: user.coin };
        res.redirect('/public/main.html');
    });
});

// 🔹 사용자 정보 조회
app.get('/process/getUserInfo', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.json({ id: null });
    }
});

// 🔹 코인 업데이트
app.post('/process/updateCoin', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    const users = loadUsers();
    const user = users.find(user => user.id === req.session.user.id);

    if (user) {
        user.coin = req.body.coin;
        saveUsers(users);
        req.session.user.coin = user.coin;
        res.json({ success: true, coin: user.coin });
    } else {
        res.status(400).json({ error: "사용자 정보 없음" });
    }
});

// 🔹 랭킹 조회
app.get('/process/getRanking', (req, res) => {
    const users = loadUsers();
    const ranking = users
        .sort((a, b) => b.coin - a.coin)  // 코인 순 정렬
        .slice(0, 10)  // 상위 10명만
        .map(({ nickname, coin }) => ({ nickname, coin }));

    res.json(ranking);
});

app.listen(3000, () => {
    console.log('Listening on port 3000');
});
