const express = require('express');
const router = express.Router();
const sequelize = require("sequelize");
const Op = sequelize.Op;

const cookieParser = require("cookie-parser");

const models = require("../../models");

const fs = require('fs');
const querystring = require('querystring');
const crypto = require('crypto'); //추가됐음
const {getPagingData, getPagination} = require('../../controller/pagination');
const {makePassword, comparePassword} = require('../../controller/passwordCheckUtil');

router.get('/userlist', (req,res,next)=>{

    let cri = {};
    let btnName = "";
    let list ={};

    res.render("userMngList",{cri, btnName, list});
})

router.get('/statistics', (req,res,next)=>{

    let Manager = {};
    let Auth = {};

    res.render("manager/main/statistics",{Manager, Auth});
})

router.get('/userMngList/:usersecess', async (req,res,next)=>{
    //usersecess 정상회원, 탈퇴회원 구분

    const usersecess = req.params.usersecess;
    let { searchType, keyword } = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const { limit, offset } = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    let dataAll = await models.user.findAll({
        where: {
            [Op.and] : [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: { [Op.like]: "%" +keyword+ "%" }
                },
                {
                    username: { [Op.like]: "%" + keyword + "%" }
                }
            ]

        },
        limit, offset
    })

    let dataCountAll = await models.user.findAndCountAll({
        where: {
            [Op.and] : [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: { [Op.like]: "%" +keyword+ "%" }
                },
                {
                    username: { [Op.like]: "%" + keyword + "%" }
                }
            ]
        },
        limit, offset
    })

    const pagingData = getPagingData(dataCountAll, currentPage, limit);

    let cri = {searchType,keyword};

    let btnName = (Boolean(Number(usersecess)) ? "회원 리스트" : "탈퇴회원 조회");

    console.log("usersecbtt->", btnName)
    let Manager = {};
    let Auth ={};
    let list = dataAll;

    res.render("manager/user/userMngList",{cri, list, btnName, pagingData, Manager, usersecess, Auth});
})



router.get('/userDetailForm/:usersecess', async (req,res,next)=> {
    //usersecess 정상회원, 탈퇴회원 구분
    const usersecess = req.params.usersecess;
    let { no, currentPage, searchType, keyword } = req.query;

    let userVO = await models.user.findOne({
        raw : true,

        where : {userno : no}
    })
    console.log("userid->", userVO);

    let cri = {};
    let Manager = {};
    let Auth = {};
    let couponLists =[{}];

    res.render("manager/user/userDetailForm", {userVO, cri, Manager, Auth, usersecess,couponLists});
});


router.get('/loginForm', async (req,res,next)=> {
    let { registerSuccess, id} = req.query;

    let UserStay = {userid:id};

    let EmpStay = {};
    let error = "";
    let Auth ={};
    let login ="";
    let Manager = {};
    let searchkeyword = "";


    res.render("user/tourlandLoginForm", {Auth,login, Manager,searchkeyword, registerSuccess, UserStay, EmpStay, error});
});



router.post('/loginForm', async (req,res,next)=> {
    let { id, pass} = req.body;
    console.log("loginForm->", id, pass)
    if(id == null) res.status(400).send('idempty');
    if(pass == null) res.status(400).send('passempty');


    if( id !== null && pass !=null){
        // ID,PASS가 입력된 경우
        let userVO = models.user.findOne({
            raw : true,
            attributes: ['userpass','usersecess'],
            where : {
                userid : id
            }
        })

        // 직원 ID가 없는 경우
        if(userVO == null) res.status(402).send("idnoneexist");
        // 직원 ID가 있는 경우
        if(userVO != null && userVO.usersecess != 1){
            res.status(402).send("retiredemployee");
        }
        if(userVO != null && userVO.usersecess == 0){
            if(comparePassword(userVO.userid, pass)){
                res.redirect('/tourlandMain?');
            }
            else{
                res.status(405).send("passwdnotequal");
            }
        }

    }

    let empVO ={};
    let session = {};

    let registerSuccess = {};
    let UserStay = {};
    let EmpStay = {};
    let error = "";
    let Auth ={};
    let login ="";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/tourlandLoginForm", {Auth,login, Manager,searchkeyword, registerSuccess, UserStay, EmpStay, error});
});



router.post('/loginForm', async (req,res,next)=> {
    let { registerSuccess, id} = req.query;
    let EmpStay = {};
    let error = "";
    let Auth ={};
    let login ="";
    let Manager = {};
    let searchkeyword = "";


    res.render("user/tourlandLoginForm", {Auth,login, Manager,searchkeyword, registerSuccess, UserStay, EmpStay, error});
});


router.get('/employee/idCheck/:userid', async (req,res,next)=> {

    const userid = req.params.userid;

    try{
        let checkUserid = await models.employee.findOne({
            raw: true,
            attributes : ['empid'],
            where : {
                userid : userid
            }
        })

        if( checkUserid != null)
        {
            console.log("check->", checkUserid.empid);
            if( checkUserid.empid != null) {
                res.status(200).send("exist");
            }
        }
        else{
            res.status(200).send("notexist");
        }
    }
    catch (e){
        console.error(e);
        next(e);
    }

});


router.get('/tourlandRegister', async (req,res,next)=> {
    let autoNo = "";

    res.render("user/tourlandRegisterForm", {autoNo});

});


module.exports = router;
