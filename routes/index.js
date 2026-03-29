const express = require("express");
const router = express.Router();
const controller = require("../controllers/ticketController");
const upload = require("../middlewares/upload");

router.get("/", controller.getAll);
router.get("/add", controller.showAddForm);
router.post("/add", upload.single("image"), controller.createTicket);
router.get("/edit/:id", controller.showEditForm);
router.post("/edit/:id", upload.single("image"), controller.updateTicket);
router.get("/delete/:id", controller.delete);

module.exports = router;