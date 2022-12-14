var express = require('express');
var router = express.Router();
const cookieParser = require("cookie-parser");
const models = require("../models");
const fs = require('fs');
const {getPagination, getPagingData} = require("../controller/pagination");
const {Op} = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const {stubFalse, reject} = require('lodash');
const querystring = require("querystring");
const resolve = require("resolve");

router.post('/login', async (req, res, next) => {
    try {
        const {userid, password, remember} = req.body;

        // validate
        if (!userid || !password)
            return res.status(400).json({
                success: false,
                result: null,
                message: 'Not all fields have been entered.',
            });

        const user = await models.user.findOne({
            where: {userid: userid}
        });
        // console.log(admin);
        if (!user)
            return res.status(400).json({
                success: false,
                result: null,
                message: 'No account with this email has been registered.',
            });

        const isMatch = await bcrypt.compare(password, user.userpass);
        if (!isMatch)
            return res.status(400).json({
                success: false,
                result: null,
                message: 'Invalid credentials.',
            });

        const token = jwt.sign(
            {
                id: user.userid,
            },
            process.env.JWT_SECRET,
            {expiresIn: '72h'}
        );
        // const result = await models.user.update(
        //     { where : {userid: user.userid} },
        //     { isLoggedIn: true },
        //     {
        //         new: true,
        //     }
        // ).exec();

        res.cookie('token', token, {
            maxAge: req.body.remember ? 72 * 60 * 60 * 1000 : 60 * 60 * 1000, // Cookie expires after 30 days
            sameSite: true,
            // httpOnly: true,
            secure: true,
        });

        res.json({
            success: true,
            result: {
                token,
                admin: {
                    id: user.userid,
                    name: user.username,
                    // isLoggedIn: user.isLoggedIn,
                },
            },
            message: 'Successfully login user',
        });
    } catch (err) {
        res.status(500).json({success: false, result: null, message: err.message, error: err});
    }

});


router.get("/logout", (req, res, next) => {

    req.session.destroy();
    console.log(`session??? ?????????????????????.`);
    res.redirect("/customer");
})


router.get('/api/airplane/:id', async function (req, res, next) {
    try {
        let searchAirplane = req.params.id;
        console.log("222->", searchAirplane);
        const airplane = await models.airplane.findOne({
            where: {
                id: searchAirplane
            }
        });
        console.log("1111->", airplane);
        res.send(airplane);

    } catch (err) {
        console.error(err);
        next(err);
    }
    res.render('index', {title: 'Express'});
});


router.get('/client/list', async (req, res, next) => {
    //usersecess ????????????, ???????????? ??????

    // const usersecess = req.params.usersecess;
    const usersecess = 0;
    let {searchType, keyword} = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ??????????????? ?????? ??????
    const currentPage = Number(req.query.page) || 1; //????????????
    const {limit, offset} = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    let dataAll = await models.user.findAll({
        where: {
            [Op.and]: [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: {[Op.like]: "%" + keyword + "%"}
                },
                {
                    username: {[Op.like]: "%" + keyword + "%"}
                }
            ]

        },
        limit, offset
    })

    let dataCountAll = await models.user.findAndCountAll({
        where: {
            [Op.and]: [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: {[Op.like]: "%" + keyword + "%"}
                },
                {
                    username: {[Op.like]: "%" + keyword + "%"}
                }
            ]
        },
        limit, offset
    })

    const pagingData = getPagingData(dataCountAll, currentPage, limit);

    let cri = {searchType, keyword};

    let btnName = (Boolean(Number(usersecess)) ? "?????? ?????????" : "???????????? ??????");

    console.log("usersecbtt->", pagingData)
    let Manager = {};
    let Auth = {};
    let list;

    if (dataCountAll != null) {
        res.status(200).json({
            success: true,
            result: dataAll,
            pagination: {page: pagingData.currentPage, pages: pagingData.totalPages, count: pagingData.totalItems},
            message: "????????? ?????? ??????!",
        });
    } else {
        res.status(203).json({
            success: false,
            result: [],
            pagination: {page: pagingData.currentPage, pages: pagingData.totalPages, count: pagingData.totalItems},
            message: "????????? ?????? ??????!",
        });
    }

})


router.get('/client/list/:usersecess', async (req, res, next) => {
    //usersecess ????????????, ???????????? ??????

    const usersecess = req.params.usersecess;
    let {searchType, keyword} = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ??????????????? ?????? ??????
    const currentPage = Number(req.query.currentPage) || 1; //????????????
    const {limit, offset} = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    let dataAll = await models.user.findAll({
        where: {
            [Op.and]: [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: {[Op.like]: "%" + keyword + "%"}
                },
                {
                    username: {[Op.like]: "%" + keyword + "%"}
                }
            ]

        },
        limit, offset
    })

    let dataCountAll = await models.user.findAndCountAll({
        where: {
            [Op.and]: [
                {
                    usersecess: usersecess
                }
            ],
            [Op.or]: [
                {
                    userid: {[Op.like]: "%" + keyword + "%"}
                },
                {
                    username: {[Op.like]: "%" + keyword + "%"}
                }
            ]
        },
        limit, offset
    })

    const pagingData = getPagingData(dataCountAll, currentPage, limit);

    let cri = {searchType, keyword};

    let btnName = (Boolean(Number(usersecess)) ? "?????? ?????????" : "???????????? ??????");

    console.log("usersecbtt->", btnName)
    let Manager = {};
    let Auth = {};
    let list = dataAll;

    res.render("manager/user/userMngList", {cri, list, btnName, pagingData, Manager, usersecess, Auth});
})

router.post('/client/create', async (req, res, next) => {
    let query;
    console.log("/client/create->", req.body);

    // Check if the email is already in use
    models.user.findOne({
        raw: true,
        where: {
            userid: req.body.userid
        }
    }).then((result) => {
        if (result) {
            res.status(401).json({message: "ID is already in use."});
            return;
        } else {
            // Define salt rounds
            const saltRounds = 10;
            // Hash password
            let userpass;
            if (req.body.userpass == null) {
                userpass = req.body.userid;
            } else {
                userpass = req.body.userpass;
            }
            //???????????? ?????? ?????? ?????? ??????
            bcrypt.hash(userpass, saltRounds, (err, hash) => {
                if (err) throw new Error("Internal Server Error");

                req.body.userpass = hash;
                const user = models.user.create(req.body);
                query = querystring.stringify({
                    "registerSuccess": true,
                    "id": user.userid
                });
                res.status(202).json({message: '????????????', query: query});
            });

        }

    });


});


router.get('/calendar/list', async (req, res, next) => {
    //usersecess ????????????, ???????????? ??????

    // const usersecess = req.params.usersecess;
    const usersecess = 0;
    let {searchType, keyword} = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ??????????????? ?????? ??????
    const currentPage = Number(req.query.page) || 1; //????????????
    const {limit, offset} = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    let dataAll = await models.calendar.findAll({
        // // where: {
        // //    calendar_uid: { [Op.like]: "%" +keyword+ "%" }
        // // },
        // limit, offset
    })

    let dataCountAll = await models.calendar.findAndCountAll({})

    const pagingData = getPagingData(dataCountAll, currentPage, limit);

    let cri = {searchType, keyword};

    let Manager = {};
    let Auth = {};
    let list;

    if (dataCountAll != null) {
        res.status(200).json({
            success: true,
            Item: dataAll,
            pagination: {page: pagingData.currentPage, pages: pagingData.totalPages, count: pagingData.totalItems},
            message: "????????? ?????? ??????!",
        });
    } else {
        res.status(203).json({
            success: false,
            result: [],
            pagination: {page: pagingData.currentPage, pages: pagingData.totalPages, count: pagingData.totalItems},
            message: "????????? ?????? ??????!",
        });
    }

})


router.post('/calendar/create', async (req, res, next) => {
    let {searchType, keyword} = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ??????????????? ?????? ??????
    const currentPage = Number(req.query.page) || 1; //????????????
    const {limit, offset} = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    console.log("1212121->", req.body);

    const user = models.calendar.create(req.body);
    res.status(202).json({message: '????????????'});

})

const getSubCategories = (id) => {
    let dataAll = models.department.findOne({
        raw: true,
        attributes: ['id', 'parent_id', 'category_name', 'is_active'],
        where: {
            parent_id: {id}
        },
        // limit, offset
    })

    return dataAll;

};

const getSubCategoriesRecursive = async (category) => {
    let subCategories = await models.department.findAll({
        attributes: ['id', 'parent_id', 'category_name', 'is_active'],
        where: {
            parent_id: category.id
        },
        raw : true
    });


    if (subCategories.length > 0) {
        const promises = [];
        subCategories.forEach(category => {
            promises.push(getSubCategoriesRecursive(category));
        });
        category['subCategories'] = await Promise.all(promises);
    }
    else category['subCategories'] = [];

    console.log("11111->", category.subCategories);

    return category;
};


router.get('/categories/list', (req, res, next) => {
    const usersecess = 0;
    let {searchType, keyword} = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ??????????????? ?????? ??????
    const currentPage = Number(req.query.page) || 1; //????????????
    const {limit, offset} = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    let cri = {searchType, keyword};
    let category= {id:1};

    getSubCategoriesRecursive(category);
})


module.exports = router;
