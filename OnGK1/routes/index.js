const express = require("express");
const router = express.Router();
const controller = require("../controllers/ticketController");
const upload = require("../middlewares/upload");

router.get("/", (req, res) => res.redirect("/books"));
router.get("/books", controller.getAll);
router.get("/books/:bookId", controller.getDetail);
router.get("/add", controller.showAddForm);
router.post("/add", upload.single("coverImage"), controller.createBook);
router.get("/edit/:bookId", controller.showEditForm);
router.post(
  "/edit/:bookId",
  upload.single("coverImage"),
  controller.updateBook,
);
router.get("/delete/:bookId", controller.deleteBook);

module.exports = router;
