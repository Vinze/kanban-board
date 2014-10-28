var express      = require('express');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var multer       = require('multer')
var fs           = require('fs');
var os           = require('os');
var ejs          = require('ejs');
var jwt          = require('jwt-simple');
var moment       = require('moment');
var Datastore    = require('nedb');
var app          = express();

// Vars
var secret = 'add73cad9ac02d9dde7ce363ee6ae207';

var db = {
	kanban: new Datastore({ filename: 'storage/database/kanban.db', autoload: true })
};

// View directory
app.set('views', __dirname + '/views')

// Set the view engine (EJS)
app.set('view engine', 'ejs');

// Enabled the bodyparser middleware for accessing POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Allow file uploads
app.use(multer({ dest: './storage/tmp/'}));

// Enable the cookieparser middleware for accessing cookies
app.use(cookieParser(secret));

// Serve static files
app.use(express.static(__dirname + '/public'));

// Use port 1337 for local development, and 1339 when live
var port = (os.hostname() == 'UbuntuVPS1') ? 1339 : 1337;

function checkAuth(req, res, next) {
	// Errors: 1 = no token provided, 2 = cannot decode token, 3 = token invalid or expired
	var token = (req.cookies && req.cookies.vbtkn) ||
	            (req.body && req.body.jwtoken) ||
	            (req.query && req.query.jwtoken) ||
	            req.headers['x-jwtoken'];
	if (token) {
		try {
			var decoded = jwt.decode(token, secret);
			if (decoded.exp > moment().unix() && decoded.ip == req.connection.remoteAddress) {
				return next();
			} else {
				return res.redirect('/login');
				// return res.status(403).end('403 - Session expired');
			}
		} catch (err) {
			return res.status(403).end('403 - Invalid session');
		}
	} else {
		return res.redirect('/login');
		// return res.status(403).end('403 - Not authenticated');
	}
}

function findCards(callback) {
	db.kanban.find({}).sort({ priority: 1, created_at: 1 }).exec(function(err, docs) {
		if (err) console.log(err);
		callback(err, docs);
	});
}

app.get('/', checkAuth, function(req, res) {
	res.render('kanban');
});

app.get('/login', function(req, res) {
	res.render('login');
});

app.post('/login', function(req, res) {
	if (req.body.pw == 8989) {
		var expires = moment().add(1, 'days').unix();
		var token = jwt.encode({
			exp: expires,
			ip: req.connection.remoteAddress
		}, secret);
		res.cookie('vbtkn', token, { maxAge: 86400000 });
		res.redirect('/');
		// res.send(token);
	} else {
		res.status(403).end('Invalid credentials');
	}
});

app.get('/cards', checkAuth, function(req, res) {
	findCards(function(err, docs) {
		res.json(docs);
	});
});

app.post('/new-card', checkAuth, function(req, res) {
	var data = {
		description : '',
		status      : 'backlog',
		priority    : 3,
		created_at  : moment().unix(),
		updated_at  : moment().unix()
	};
	db.kanban.insert(data, function(err, doc) {
		if (err) console.log(err);
		findCards(function(err, docs) {
			res.json(docs);
		});
	});
});

app.post('/edit-card/:card_id', checkAuth, function(req, res) {
	var card_id = req.params.card_id;
	var data = {
		description : req.body.description,
		status      : req.body.status,
		priority    : parseInt(req.body.priority),
		updated_at  : moment().unix()
	};
	db.kanban.update({ _id: card_id }, { $set: data }, function(err, num_replaced) {
		if (err) console.log(err);
		findCards(function(err, docs) {
			res.json(docs);
		});
	});
});

app.post('/delete-card/:card_id', checkAuth, function(req, res) {
	var card_id = req.params.card_id;
	db.kanban.remove({ _id: card_id }, function(err, num_deleted) {
		if (err) console.log(err);
		findCards(function(err, docs) {
			res.json(docs);
		});
	});
});

app.get('/export', checkAuth, function(req, res) {
	var filename = 'kanban-' + Date.now() + '.json';
	db.kanban.find({}, { _id: 0 }).sort({ priority: 1, created_at: 1 }).exec(function(err, docs) {
		res.setHeader('Content-disposition', 'attachment; filename=' + filename);
		res.send(docs);
	});
});

app.post('/import', checkAuth, function(req, res) {
	var filepath = './' + req.files.file.path;

	fs.readFile(filepath, function(err, data) {
		var import_data = JSON.parse(data);
		fs.unlink(filepath);
		db.kanban.insert(import_data, function(err) {
			res.redirect('/');
		});
	});
});

app.post('/clear', checkAuth, function(req, res) {
	db.kanban.remove({}, { multi: true }, function(err) {
		if (err) console.log(err);
		res.json([]);
	});
});

// Catch all (404)
app.all('*', function(req, res) {
	res.status(404).send('Page not found!');
});

// Listen on the specified port
app.listen(port);