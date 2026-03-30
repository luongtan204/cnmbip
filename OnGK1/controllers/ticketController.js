const {
  ScanCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/aws");
const { uploadImage, deleteImage } = require("../utils/s3Service");

const TABLE_NAME = process.env.TABLE_NAME || "Book";
const ALLOWED_CATEGORIES = ["Tiểu thuyết", "CNTT", "Kinh tế", "Thiếu nhi"];

function normalizeBookInput(data = {}) {
  return {
    title: (data.title || "").trim(),
    author: (data.author || "").trim(),
    category: (data.category || "").trim(),
    price: Number(data.price),
    unit_in_stock: Number(data.unit_in_stock),
  };
}

function validateBook(book) {
  const errors = [];
  if (!book.title) errors.push("Tiêu đề không được để trống.");
  if (!(book.price > 0)) errors.push("Giá sách phải lớn hơn 0.");
  if (!(book.unit_in_stock >= 0))
    errors.push("Số lượng tồn kho phải lớn hơn hoặc bằng 0.");
  if (!ALLOWED_CATEGORIES.includes(book.category)) {
    errors.push(
      "Thể loại không hợp lệ. Chỉ chấp nhận: Tiểu thuyết, CNTT, Kinh tế, Thiếu nhi.",
    );
  }
  return errors;
}

function withTotalValue(book) {
  return {
    ...book,
    totalValue: Number(book.price) * Number(book.unit_in_stock),
  };
}

function searchBooks(books, keyword) {
  if (!keyword) return books;
  const kw = keyword.toLowerCase().trim();
  return books.filter((book) => {
    const title = (book.title || "").toLowerCase();
    const author = (book.author || "").toLowerCase();
    return title.includes(kw) || author.includes(kw);
  });
}

exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let books =
      (await docClient.send(new ScanCommand({ TableName: TABLE_NAME })))
        .Items || [];
    books = books.map((book) => withTotalValue(book));
    books = searchBooks(books, search);

    const totalStoreValue = books.reduce(
      (sum, book) => sum + Number(book.totalValue || 0),
      0,
    );

    res.render("index", {
      books,
      search: search || "",
      totalStoreValue,
    });
  } catch (error) {
    res.status(500).send("Lỗi: " + error.message);
  }
};

exports.showAddForm = (req, res) => {
  res.render("add", {
    book: {},
    errors: [],
    categories: ALLOWED_CATEGORIES,
  });
};

exports.createBook = async (req, res) => {
  const data = req.body;
  const normalizedBook = normalizeBookInput(data);
  const errors = validateBook(normalizedBook);
  if (req.fileValidationError) errors.push(req.fileValidationError);
  if (errors.length > 0) {
    return res.render("add", {
      book: { ...data },
      errors,
      categories: ALLOWED_CATEGORIES,
    });
  }

  const coverImageUrl = req.file ? await uploadImage(req.file) : "";
  const book = withTotalValue({
    bookId: uuidv4(),
    title: normalizedBook.title,
    author: normalizedBook.author,
    category: normalizedBook.category,
    price: normalizedBook.price,
    unit_in_stock: normalizedBook.unit_in_stock,
    coverImageUrl,
    createdAt: new Date().toISOString(),
  });

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: book }));
  res.redirect("/books");
};

exports.showEditForm = async (req, res) => {
  try {
    const data = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { bookId: req.params.bookId },
      }),
    );

    if (!data.Item) {
      return res.status(404).send("Không tìm thấy sách.");
    }

    res.render("edit", {
      book: withTotalValue(data.Item),
      errors: [],
      categories: ALLOWED_CATEGORIES,
    });
  } catch (error) {
    res.status(500).send("Lỗi: " + error.message);
  }
};

exports.updateBook = async (req, res) => {
  const data = req.body;
  const normalizedBook = normalizeBookInput(data);
  const errors = validateBook(normalizedBook);
  if (req.fileValidationError) errors.push(req.fileValidationError);
  if (errors.length > 0) {
    return res.render("edit", {
      book: { bookId: req.params.bookId, ...data },
      errors,
      categories: ALLOWED_CATEGORIES,
    });
  }

  const existingBook = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { bookId: req.params.bookId },
    }),
  );

  if (!existingBook.Item) {
    return res.status(404).send("Không tìm thấy sách.");
  }

  let coverImageUrl = data.oldCoverImageUrl || "";
  if (req.file) {
    coverImageUrl = await uploadImage(req.file);
    if (data.oldCoverImageUrl) await deleteImage(data.oldCoverImageUrl);
  }

  const updatedBook = withTotalValue({
    bookId: req.params.bookId,
    title: normalizedBook.title,
    author: normalizedBook.author,
    category: normalizedBook.category,
    price: normalizedBook.price,
    unit_in_stock: normalizedBook.unit_in_stock,
    coverImageUrl,
    createdAt: existingBook.Item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: updatedBook }),
  );
  res.redirect("/books");
};

exports.getDetail = async (req, res) => {
  try {
    const data = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { bookId: req.params.bookId },
      }),
    );

    if (!data.Item) {
      return res.status(404).send("Không tìm thấy sách.");
    }

    res.render("form", {
      book: withTotalValue(data.Item),
      errors: [],
      mode: "detail",
      categories: ALLOWED_CATEGORIES,
    });
  } catch (error) {
    res.status(500).send("Lỗi: " + error.message);
  }
};

exports.deleteBook = async (req, res) => {
  const bookInfo = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { bookId: req.params.bookId },
    }),
  );

  if (bookInfo.Item && bookInfo.Item.coverImageUrl) {
    await deleteImage(bookInfo.Item.coverImageUrl);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { bookId: req.params.bookId },
    }),
  );
  res.redirect("/books");
};
