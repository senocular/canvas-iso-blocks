var canvas = document.getElementById("canvas"); // TODO: manage canvas in env
var context = canvas.getContext("2d");
var scale = 100; // TODO: more granular control over sizing
var texture = null; // TODO: per-block texture mapping
var env = null;

function init(){
	env = new Environment();
	env.origin.x = canvas.width/2;
	env.origin.y = canvas.height/2;

	texture = new Image();
	texture.onload = imageLoaded;
	texture.src = "sides.fw.png";
}

function imageLoaded(){
	canvas.addEventListener("mousemove", handleMousePerspective);
}

function handleMousePerspective(event){
	clear();

	Mouse.get(event);
	var ay = -(2*Math.PI) * Mouse.x/canvas.width;
	var ax = -(2*Math.PI) * Mouse.y/canvas.height;

	env.transform.identity();
	env.transform.rotateX(ax);
	env.transform.rotateY(ay);

	drawBlocks([
		new Block(new Point3D(0,0,0)).place(),
		new Block(new Point3D(1,0,0)).place(),
		new Block(new Point3D(-1,0,0)).place(),
		new Block(new Point3D(1,1,0)).place()
	]);
}

function clear(){
	context.setTransform(1,0,0,1,0,0);
	context.clearRect(0,0,canvas.width,canvas.height);
}

function drawBlocks(blocks){
	blocks.sort(sortOnOffsetZ);
	for (var i=0, n=blocks.length; i<n; i++){
		blocks[i].draw();
	}
}

function sortOnOffsetZ(a, b){
	return a.offset.z - b.offset.z;
}


/********************\
		CLASSES
/********************/

function Environment(){
	this.transform = new Matrix3D();
	this.origin = new Point2D();
}

function Block(loc){
	this.loc = loc;
	this.offset = this.loc.clone();
}

Block.prototype.place = function(){
	this.offset.copy(this.loc);
	env.transform.transformPoint(this.offset);
	this.offset.scale(scale);
	return this;
};

Block.prototype.draw = function(){
	var r = env.transform;

	// TODO: pre-calc once in env
	var top1    = new Matrix2D(r.a,r.d,   r.c,r.f,  0,0);
	var bottom2 = new Matrix2D(r.a,r.d,  -r.c,-r.f, r.c+r.b,r.f+r.e);
	var side3   = new Matrix2D(r.a,r.d,   r.b,r.e,  r.c,r.f);
	var side4   = new Matrix2D(-r.c,-r.f, r.b,r.e,  r.a+r.c,r.d+r.f);
	var side5   = new Matrix2D(-r.a,-r.d, r.b,r.e,  r.a,r.d);
	var side6   = new Matrix2D(r.c,r.f,   r.b,r.e,  0,0);

	this.drawTexture(1, top1);
	this.drawTexture(2, bottom2);
	this.drawTexture(3, side3);
	this.drawTexture(4, side4);
	this.drawTexture(5, side5);
	this.drawTexture(6, side6);
};

Block.prototype.drawTexture = function(side, m){

	// TODO: pre-calc faces to draw in env
	var magnitude = m.a*m.d - m.b*m.c;
	var isFrontFracing = magnitude > 0;

	if (isFrontFracing){

		// TODO: need texture size vs scale here; scale is temp, 
		// but may be needed to alter texture size to fit
		var x = this.offset.x + env.origin.x + m.x * scale;
		var y = this.offset.y + env.origin.y + m.y * scale;
		var srcX = (side - 1) * scale; 
		context.setTransform(m.a, m.b, m.c, m.d, x, y);
		context.drawImage(texture, srcX,0, scale,scale, 0,0, scale,scale);
	}
}

// quick and dirty tweener for testing
function Anim(from, to, frames){
	this.from = from;
	this.to = to;
	this.frames = frames;

	this.frame = 0;
	this.value = from;

	this.onframe = null;
	this.oncomplete = null;

	this.next = this.next.bind(this);
}

Anim.prototype.start = function(){
	this.frame = 0;
	this.update();
	this.validateNext();
};

Anim.prototype.next = function(){
	this.frame++;
	this.update();
	this.validateNext();
};

Anim.prototype.update = function(){
	var prog = this.frame/this.frames;
	this.value = this.from + (this.to - this.from)*prog;
	if (this.onframe){
		this.onframe(this.value);
	}
};

Anim.prototype.validateNext = function(){
	var nextFrame = this.frame + 1;
	if (nextFrame > this.frames){
		this.value = this.to;
		if (this.oncomplete){
			this.oncomplete(this.value);
		}
	}else{
		requestAnimationFrame(this.next);
	}
};


function Point2D(x,y){
	this.x = x || 0;
	this.y = y || 0;
}

Point2D.prototype.clone = function(){
	return new Point2D(this.x, this.y);
};


function Point3D(x,y,z){
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
}

Point3D.prototype.clone = function(){
	return new Point3D(this.x, this.y, this.z);
};

Point3D.prototype.copy = function(pt){
	this.x = pt.x;
	this.y = pt.y;
	this.z = pt.z;
};

Point3D.prototype.scale = function(n){
	this.x *= n;
	this.y *= n;
	this.z *= n;
};


function Matrix2D(a,b,c,d,x,y){
	if (arguments.length){
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.x = x;
		this.y = y;
	}else{
		this.identity();
	}
}

Matrix2D.prototype.toString = function(){
	return "matrix("+this.a+","+this.b+","+this.c+","+this.d+","
		+this.x+","+this.y+")";
};

Matrix2D.prototype.identity = function() {
	this.a = 1;
	this.b = 0;
	this.c = 0;
	this.d = 1;
	this.x = 0;
	this.y = 0;
};

Matrix2D.prototype.rotate = function(angle){
	var cos = Math.cos(angle);
	var sin = Math.sin(angle);

	var a = this.a;
	var c = this.c;
	var x = this.x;
	this.a = cos * a - sin * this.b;
	this.b = sin * a + cos * this.b;
	this.c = cos * c - sin * this.d;
	this.d = sin * c + cos * this.d;
	this.x = cos * x - sin * this.y;
	this.y = sin * x + cos * this.y;
};

Matrix2D.prototype.scale = function(x, y) {
	this.a *= x;
	this.b *= y;
	this.c *= x;
	this.d *= y;
	this.x *= x;
	this.y *= y;
};

Matrix2D.prototype.translate = function(x, y){
	this.x += x;
	this.y += y;
};


function Matrix3D(a,b,c,d,e,f,g,h,i){
	if (arguments.length){
		this.a = a; this.b = b; this.c = c;
		this.d = d; this.e = e; this.f = f;
		this.g = g; this.h = h; this.i = i;
	}else{
		this.identity();
	}
}

Matrix3D.prototype.toString = function(){
	return 
		 "[" + this.a + "," + this.b + "," + this.c + "]\n" 
		+"[" + this.d + "," + this.e + "," + this.f + "]\n"
		+"[" + this.g + "," + this.h + "," + this.i + "]";
};

Matrix3D.prototype.identity = function(){
	this.a = 1; this.b = 0; this.c = 0;
	this.d = 0; this.e = 1; this.f = 0;
	this.g = 0; this.h = 0; this.i = 1;
};

Matrix3D.prototype.rotateX = function(angle){
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	this.concat(new Matrix3D(
		 1, 0, 0,
		 0, c,-s,
		 0, s, c
	));
};

Matrix3D.prototype.rotateY = function(angle){
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	this.concat(new Matrix3D(
		 c, 0, s,
		 0, 1, 0,
		-s, 0, c
	));
};

Matrix3D.prototype.rotateZ = function(angle){
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	this.concat(new Matrix3D(
		 c,-s, 0,
		 s, c, 0,
		 0, 0, 1
	));
};

Matrix3D.prototype.transformPoint = function(p){
	var x = p.x;
	var y = p.y;
	var z = p.z;
	p.x = x*this.a + y*this.b + z*this.c;
	p.y = x*this.d + y*this.e + z*this.f;
	p.z = x*this.g + y*this.h + z*this.i;
	return p;
};

Matrix3D.prototype.concat = function(m){
	var a = this.a, b = this.b, c = this.c;
	var d = this.d, e = this.e, f = this.f;
	var g = this.g, h = this.h, i = this.i;

	this.a = a*m.a + b*m.d + c*m.g;
	this.b = a*m.b + b*m.e + c*m.h;
	this.c = a*m.c + b*m.f + c*m.i;
	this.d = d*m.a + e*m.d + f*m.g;
	this.e = d*m.b + e*m.e + f*m.h;
	this.f = d*m.c + e*m.f + f*m.i;
	this.g = g*m.a + h*m.d + i*m.g;
	this.h = g*m.b + h*m.e + i*m.h;
	this.i = g*m.c + h*m.f + i*m.i;
};

var Mouse = {
	x:0,
	y:0,
	get: function(event, elem){
		if (!elem){
			elem = event.currentTarget;
		}

		var rect = elem.getBoundingClientRect();
		this.x = parseInt(event.clientX, 10) + elem.scrollLeft - elem.clientLeft - rect.left;
		this.y = parseInt(event.clientY, 10) + elem.scrollTop  - elem.clientTop  - rect.top;
		return this;
	}
};

init();