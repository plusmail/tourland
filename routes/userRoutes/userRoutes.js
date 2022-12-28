const express = require('express');
const router = express.Router();
const sequelize = require("sequelize");
const Serializer = require('sequelize-to-json')
const Op = sequelize.Op;
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const {QueryTypes} = require("sequelize");

const models = require("../../models/index");
const { product, airplane, tour, hotel, rentcar, pairstatus, ptourstatus, photelstatus, prentstatus } = require('../../models/index');

const fs = require('fs');
const querystring = require('querystring');
const crypto = require('crypto'); //추가됐음
const {getPagingData, getPagination} = require('../../controller/pagination');
const {makePassword, comparePassword} = require('../../controller/passwordCheckUtil');
global.Auth = {};

router.get('/', async (req, res, next) => {

    const currentProductPrice = {};
    const currentProductPrice2 = {};
    const currentProduct = {};
    const currentProduct2 = {};

    const popup1 = await models.popup.findOne({
        raw: true,
        where: {
            position: "R"
        }
    });

    const startDate = new Date(popup1.enddate) - new Date(popup1.startdate);
    const endDate = Math.abs(startDate / (24 * 60 * 60 * 1000));

    // console.log("startdate->", startDate);
    // console.log("enddate->", endDate);

    const cookieConfig = {
        expires: new Date(Date.now() + endDate * 24 * 60 * 60),
        path: '/',
        signed: true
    };
    res.cookie("popup1", popup1.pic, cookieConfig)

    const popup2 = await models.popup.findOne({
        raw: true,
        where: {
            position: "L"
        }
    });

    const startDate2 = new Date(popup2.enddate) - new Date(popup2.startdate);
    const endDate2 = Math.abs(startDate2 / (24 * 60 * 60 * 1000));

    const cookieConfig2 = {
        expires: new Date(Date.now() + endDate2 * 24 * 60 * 60),
        path: '/',
        signed: true,
    };
    res.cookie("popup2", popup2.pic, cookieConfig2)


    const banner1 = await models.banner.findOne({
        raw: true,
        where: {
            position: "L"
        }
    });
    const banner2 = await models.banner.findOne({
        raw: true,
        where: {
            position: "R"
        }
    });

    let Auth = null;
    let login = "";

    let msg = `세션이 존재하지 않습니다.`
    if (req.session.user) {
        msg = `${req.session.user.User}`;
        Auth = {username: req.session.user.User};
        login = req.session.user.login;
    }

    console.log("Auth->", Auth, msg);

    let Manager = {};
    let {searchType, keyword, keyword2} = req.query;
    let searchkeyword = keyword;


    res.render('tourlandMain', {
        currentProductPrice,
        currentProductPrice2,
        currentProduct,
        currentProduct2,
        popup1: popup1,
        popup2,
        banner1,
        banner2,
        Auth,
        login,
        Manager,
        searchkeyword
    });

});


router.get('/tourlandRegister', function (req, res, next) {

    let autoNo = "";

    let userVO = {};


    let Auth = null;
    let login = "";

    let msg = `세션이 존재하지 않습니다.`
    if (req.session.user) {
        msg = `${req.session.user.User}`;
        Auth = {username: req.session.user.User};
        login = req.session.user.login;
    }

    console.log("Auth->", Auth, msg);

    let Manager = {};
    let {searchType, keyword, keyword2} = req.query;
    let searchkeyword = keyword;


    res.render("user/tourlandRegisterForm", {autoNo, Auth, login, Manager, searchkeyword, userVO});
});

router.post('/tourlandRegister', async (req, res, next) => {
    let query;
    console.log("register->", req.body);

    // Check if the email is already in use
    let userExists = await models.user.findOne({
        raw: true,
        where: {
            userid: req.body.userid
        }
    });

    if (userExists) {
        res.status(401).json({message: "Email is already in use."});
        return;
    }

    // Define salt rounds
    const saltRounds = 10;
    // Hash password
    bcrypt.hash(req.body.userpass, saltRounds, (err, hash) => {
        if (err) throw new Error("Internal Server Error");

        req.body.userpass = hash;

        const user = models.user.create(req.body);
        query = querystring.stringify({
            "registerSuccess": true,
            "id": user.userid
        });
        res.redirect('/customer/loginForm/?' + query);
    });

});


router.get('/idCheck/:userid', async (req, res, next) => {

    const userid = req.params.userid;

    try {
        let checkUserid = await models.user.findOne({
            raw: true,
            attributes: ['userid'],
            where: {
                userid: userid
            }
        })

        if (checkUserid != null) {
            console.log("check->", checkUserid.userid);
            if (checkUserid.userid != null) {
                res.status(200).send("exist");
            }
        } else {
            res.status(200).send("notexist");
        }
    } catch (e) {
        console.error(e);
        next(e);
    }

});


router.get('/loginForm', async (req, res, next) => {
    let {registerSuccess, id} = req.query;

    let UserStay = {userid: id};

    let EmpStay = {};
    let error = "";
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render("user/tourlandLoginForm", {
        Auth,
        login,
        Manager,
        searchkeyword,
        registerSuccess,
        UserStay,
        EmpStay,
        error
    });
});


const fecthData = async (req) => {
    let {id, pass} = req.body;
    let error = "";

    if (id == null) {
        error = 'idempty';
    }
    if (pass == null) {
        error = 'passempty';
    }

    let userVO;
    try {
        if (id !== null && pass != null) {
            // ID,PASS가 입력된 경우
            userVO = await models.user.findOne({
                raw: true,
                // attributes: ['userid', 'userpass','usersecess'],
                where: {
                    userid: id
                }
            })
        }

    } catch (e) {
        console.log(e);
    }

    return userVO;

}


router.post('/loginForm', (req, res, next) => {
    let {id, pass} = req.body;

    let empVO = {};
    let session = {};

    let registerSuccess = {};
    let UserStay;
    let EmpStay = {};
    let error = "";
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let loginSuccess = false;

    fecthData(req).then((userVO) => {

        // 직원 ID가 없는 경우
        if (userVO.userid == null) {
            error = "idnoneexist";
        } else {

            // 직원 ID가 있고 탈퇴한 회원
            if (userVO.usersecess === 1) {
                error = "retiredcustomer";
            } else if (userVO.usersecess === 0) {
                bcrypt.compare(req.body.pass, userVO.userpass, (err, result) => {
                    console.log("comparePassword2222->", result);
                    UserStay = userVO;
                    if (result) {
                        loginSuccess = true;

                        if (req.session.user) {
                            console.log(`세션이 이미 존재합니다.`);
                        } else {
                            req.session.user = {
                                "User": userVO.username,
                                "id": id,
                                "login": "user",
                                "Auth": userVO.userpass,
                                "pass": pass,
                                "mypage": "mypageuser",
                            }
                            console.log(`세션 저장 완료! `);
                        }
                        res.redirect('/customer');
                    } else {
                        console.log("comparePassword4444->", result);
                        error = "passnotequal";
                        res.render("user/tourlandLoginForm", {
                            Auth,
                            login,
                            Manager,
                            searchkeyword,
                            registerSuccess,
                            UserStay,
                            EmpStay,
                            error
                        });

                    }
                })

            } else {
                error = "usernotfind";
            }

        }

    })

});


router.get("/logout", (req, res, next) => {

    req.session.destroy();
    console.log(`session을 삭제하였습니다.`);
    res.redirect("/customer");
})


router.get("/tourlandProductJPList", async (req, res, next) => {

    const userid = req.params.userid;
    let {searchType, keyword} = req.query;
    const contentSize = Number(process.env.CONTENTSIZE); // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const {limit, offset} = getPagination(currentPage, contentSize);
    let searchQuery = "";

    if (searchType == "name") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "expire") {
        searchQuery = `and pexpire like concat('%',${keyword},'%')`;
    }
    if (searchType == "userCart") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "location") {
        if (keyword === "한국") {
            searchQuery = `and pname like '%제주%'`;
        }
        if (keyword === "일본") {
            searchQuery = `and pname like '%도쿄%'`;
        }
        if (keyword === "중국") {
            searchQuery = `and pname like '%베이징%'`;
        }
    }

    try {

          const list = await product.findAll({
            // raw : true,
            nest: true, attributes: ['id','pname','pcontent', 'pexpire', 'pprice','ppic'],
            include :[
                {model : models.airplane,attributes:['price'],as : 'airplaneId_airplanes',nest: true, paranoid: true, required: false, nest: true,},
                {model : models.hotel,attributes:['checkin', 'checkout','price'],as : 'hotelId_hotels',nest: true, paranoid: true, required: false, nest: true,},
                {model : models.tour,attributes:['tprice'], as : 'tourId_tours',nest: true, paranoid: true, required: false, nest: true,},
                {model : models.rentcar,as : 'rentcarId_rentcars',nest: true, paranoid: true, required: false, nest: true,},
            ],
            where : {
                pname  : {
                    [Op.like] : "%" + '제주 3일' + "%"
                }
            },
        });

        console.log(list[0].dataValues);

        // let list = [];
        let Auth = {};
        let login = "";
        let Manager = {};
        let searchkeyword = "";
        let error = "";
        let pageMaker = {};
        let cri = {};
        let idx = '';
        let pagingData = {};
        let tourDays = '';
        let date = '';
        let capa = '';
        let count = '';

        if( list != null)
        {
            res.render("user/product/tourlandProductJPList", {tourDays, date,capa,count, list, Auth,login, Manager,searchkeyword, error,pageMaker,pagingData,cri, idx});
        }
        else{
            res.status(202).send("notexist");
        }
    } catch (e) {
        console.error(e);
        next(e);
    }

})


router.get("/tourlandProductJPList2", async (req, res, next) => {

    const userid = req.params.userid;
    let {searchType, keyword} = req.query;
    const contentSize = Number(process.env.CONTENTSIZE); // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const {limit, offset} = getPagination(currentPage, contentSize);
    let searchQuery = "";

    if (searchType == "name") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "expire") {
        searchQuery = `and pexpire like concat('%',${keyword},'%')`;
    }
    if (searchType == "userCart") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "location") {
        if (keyword === "한국") {
            searchQuery = `and pname like '%제주%'`;
        }
        if (keyword === "일본") {
            searchQuery = `and pname like '%도쿄%'`;
        }
        if (keyword === "중국") {
            searchQuery = `and pname like '%베이징%'`;
        }
    }

    try {
        const query = `select p.id,
                              p.pname,
                              p.pcontent,
                              p.pexpire,
                              p.pprice,
                              p.ppic,
                              p.pdiv,
                              a2.id       as a2no,
                              a2.ano,
                              a2.dlocation,
                              a2.rlocation,
                              a2.ddate,
                              a2.rdate,
                              a2.ldiv,
                              a2.capacity as a2capacity,
                              a2.seat,
                              a2.price    as a2price,
                              a2.pdiv,
                              h2.id       as h2no,
                              h2.hname,
                              h2.haddr,
                              h2.checkin,
                              h2.checkout,
                              h2.capacity as h2capacity,
                              h2.price    as h2price,
                              h2.roomcapacity,
                              h2.roomtype,
                              h2.ldiv,
                              h2.bookedup,
                              h2.totalcapacity,
                              h2.pdiv,
                              t2.id       as t2no,
                              t2.tname,
                              t2.tlocation,
                              t2.startdate,
                              t2.enddate,
                              t2.taddr,
                              t2.etime,
                              t2.capacity as t2capacity,
                              t2.tprice   as t2tprice,
                              t2.ldiv,
                              t2.pdiv,
                              r2.id       as r2no,
                              r2.cdiv,
                              r2.cno,
                              r2.rentddate,
                              r2.returndate,
                              r2.rentaddr,
                              r2.returnaddr,
                              r2.price    as r2price,
                              r2.capacity as r2capacity,
                              r2.insurance,
                              r2.ldiv,
                              r2.pdiv
                       from (select * from product where substring(pname, 2, 3) = '도쿄' ` + searchQuery + ` order by id desc limit ${currentPage}, 
${contentSize}) p 
join pairstatus a on p.id = a.id 
join airplane a2 on a.ano = a2.id
join photelstatus h on p.id = h.id 
join hotel h2 on h.hno = h2.id
join ptourstatus t on p.id = t.id 
join tour t2 on t.tno = t2.id
join prentstatus r on p.id = r.id 
join rentcar r2 on r.rno = r2.id
where p.pdiv = 0`;


        let list = await models.sequelize.query(query, {type: QueryTypes.SELECT,nest: true,raw: true})


        // let list = [];
        let Auth = {};
        let login = "";
        let Manager = {};
        let searchkeyword = "";
        let error = "";
        let pageMaker = {};
        let cri = {};
        let idx = '';
        let pagingData = {};
        let tourDays = '';
        let date = '';
        let capa = '';
        let count = '';
        // list = JSON.stringify(list, null, 2);
        console.log("3333333333->", list);

        if (list != null) {
            res.render("user/product/tourlandProductJPList", {
                tourDays,
                date,
                capa,
                count,
                list,
                Auth,
                login,
                Manager,
                searchkeyword,
                error,
                pageMaker,
                pagingData,
                cri,
                idx
            });
        } else {
            res.status(202).send("notexist");
        }
    } catch (e) {
        console.error(e);
        next(e);
    }

})



router.get("/tourlandProductJPList3", async (req, res, next) => {

    const userid = req.params.userid;
    let {searchType, keyword} = req.query;
    const contentSize = Number(process.env.CONTENTSIZE); // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const {limit, offset} = getPagination(currentPage, contentSize);
    let searchQuery = "";

    if (searchType == "name") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "expire") {
        searchQuery = `and pexpire like concat('%',${keyword},'%')`;
    }
    if (searchType == "userCart") {
        searchQuery = `and pname like concat('%',${keyword},'%')`;
    }
    if (searchType == "location") {
        if (keyword === "한국") {
            searchQuery = `and pname like '%제주%'`;
        }
        if (keyword === "일본") {
            searchQuery = `and pname like '%도쿄%'`;
        }
        if (keyword === "중국") {
            searchQuery = `and pname like '%베이징%'`;
        }
    }

    try {
        const query = `select p.*,
                              ((a2.price * 2) + (h2.price * datediff(h2.checkout, h2.checkin)) + tsum) as 'defaultPrice'
                       from (select p2.*, sum(t2.tprice) as 'tsum'
                             from product p2
                                      join ptourstatus t on p2.pno = t.pno
                                      join tour t2 on t.tno = t2.no
                             group by p2.pno) p
                                join pairstatus a on p.pno = a.pno
                                join airplane a2 on a.ano = a2.no and a2.seat = 'E'
                                join photelstatus h on p.pno = h.pno
                                join hotel h2 on h.hno = h2.no and h2.roomtype = 'N' and h2.checkin = date (a2.ddate)
                           join ptourstatus t
                       on p.pno = t.pno join tour t2 on t.tno = t2.no
                           join prentstatus r on p.pno = r.pno join rentcar r2 on r.rno = r2.no
                       where p.pdiv = 0 and substring (p.pname, 2, 3) = '제주'
                       group by p.pno
                       order by defaultPrice;`;


        let list = await models.sequelize.query(query, {type: QueryTypes.SELECT,nest: true,raw: true})


        // let list = [];
        let Auth = {};
        let login = "";
        let Manager = {};
        let searchkeyword = "";
        let error = "";
        let pageMaker = {};
        let cri = {};
        let idx = '';
        let pagingData = {};
        let tourDays = '';
        let date = '';
        let capa = '';
        let count = '';
        list = JSON.stringify(list, null, 2);
        console.log("3333333333->", list);

        if (list != null) {
            res.render("user/product/tourlandProductJPList", {
                tourDays,
                date,
                capa,
                count,
                list,
                Auth,
                login,
                Manager,
                searchkeyword,
                error,
                pageMaker,
                pagingData,
                cri,
                idx
            });
        } else {
            res.status(202).send("notexist");
        }
    } catch (e) {
        console.error(e);
        next(e);
    }

})



module.exports = router;

