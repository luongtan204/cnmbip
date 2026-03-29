const { ScanCommand, PutCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/aws");
const { validateTicket, processBusinessLogic, searchTickets, filterByStatus } = require("../utils/logic");
const { uploadImage, deleteImage } = require("../utils/s3Service");
require("dotenv").config();
const TABLE_NAME = process.env.DYNAMO_TABLE;

exports.getAll = async (req, res) => {
    try {
        const { search, status, layout } = req.query;
        let items = (await docClient.send(new ScanCommand({ TableName: TABLE_NAME }))).Items || [];
        items = searchTickets(items, search);
        items = filterByStatus(items, status);
        res.render("index", { tickets: items, layout: layout || "table", search, status });
    } catch (error) { res.status(500).send("Lỗi: " + error.message); }
};

exports.showAddForm = (req, res) => res.render("add", { ticket: {}, errors: [] });

exports.createTicket = async (req, res) => {
    const data = req.body; const errors = validateTicket(data);
    if (req.fileValidationError) errors.push(req.fileValidationError);
    if (errors.length > 0) return res.render("add", { ticket: data, errors });

    let imageUrl = req.file ? await uploadImage(req.file) : "";
    const ticket = { ticketId: uuidv4(), ...data, imageUrl, ...processBusinessLogic(data.category, data.quantity, data.pricePerTicket), createdAt: new Date().toISOString() };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: ticket }));
    res.redirect("/");
};

exports.showEditForm = async (req, res) => {
    const data = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { ticketId: req.params.id } }));
    res.render("edit", { ticket: data.Item || {}, errors: [] });
};

exports.updateTicket = async (req, res) => {
    const data = req.body; const errors = validateTicket(data);
    if (req.fileValidationError) errors.push(req.fileValidationError);
    if (errors.length > 0) return res.render("edit", { ticket: { ticketId: req.params.id, ...data }, errors });

    let imageUrl = data.oldImageUrl;
    if (req.file) {
        imageUrl = await uploadImage(req.file);
        if (data.oldImageUrl) await deleteImage(data.oldImageUrl);
    }
    const ticket = { ticketId: req.params.id, ...data, imageUrl, ...processBusinessLogic(data.category, data.quantity, data.pricePerTicket), updatedAt: new Date().toISOString() };
    delete ticket.oldImageUrl;
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: ticket }));
    res.redirect("/");
};

exports.delete = async (req, res) => {
    const ticketInfo = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { ticketId: req.params.id } }));
    if (ticketInfo.Item && ticketInfo.Item.imageUrl) await deleteImage(ticketInfo.Item.imageUrl);
    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { ticketId: req.params.id } }));
    res.redirect("/");
};