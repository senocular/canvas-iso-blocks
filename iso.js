var textures = null;
var env = null;

function init(){
	env = new Environment("canvas");
	textures = new Image();
	textures.onload = texturesLoaded;
	textures.src = "sides.fw.png";
}

function texturesLoaded(){
	//canvas.addEventListener("mousemove", handleMousePerspective);
	requestAnimationFrame(autoSpin);
	render(0, 0);
}

var ax=0, ay=0;
function autoSpin(){
	env.clear();
	ax = -0.3;
	ay += 0.02;
	render(ax, ay);
	requestAnimationFrame(autoSpin);
}

function handleMousePerspective(event){
	env.clear();

	// TODO: click to drag rotation rather than on move
	Mouse.get(event);
	var ax = -(2*Math.PI) * Mouse.y/env.canvas.height;
	var ay = -(2*Math.PI) * Mouse.x/env.canvas.width;
	render(ax, ay);
}

function render(rotationAroundX, rotationAroundY){
	env.transform.identity();
	env.transform.rotateX(rotationAroundX);
	env.transform.rotateY(rotationAroundY);
	env.commitTransform();


	// TODO: store blocks in persistent graph
	// rather than recreate every frame

	var texture = new BlockTexture(textures, 0,0,100,100);

	drawBlocks([
		new Block(new Point3D( 0,0,0), texture).place(),
		new Block(new Point3D( 1,0,0), texture).place(),
		new Block(new Point3D(-1,0,0), texture).place(),
		new Block(new Point3D( 1,1,0), texture).place()
	]);
}

function drawBlocks(blocks){
	blocks.sort(sortOnPlacedZ);
	for (var i=0, n=blocks.length; i<n; i++){
		blocks[i].draw();
	}
}

function sortOnPlacedZ(a, b){
	return a.placement.z - b.placement.z;
}


/********************\
		CLASSES
/********************/

function Environment(canvasId){
	this.canvas = document.getElementById(canvasId);
	this.context = this.canvas.getContext("2d");
	this.origin = new Point2D(this.canvas.width/2, this.canvas.height/2);
	this.scale = 100;

	this.transform = new Matrix3D();
	this.faces = [];
	this.faceIndices = [];
}

Environment.isFaceFrontFacing = function(m){
	return m.a*m.d - m.b*m.c > 0;
};

Environment.prototype.clear = function(){
	this.context.setTransform(1,0,0,1,0,0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Environment.prototype.commitTransform = function(){
	var t = this.transform;
	this.faces = [
		new Matrix2D( t.a,t.d,   t.c,t.f,  0,0),
		new Matrix2D( t.a,t.d,  -t.c,-t.f, t.b+t.c,t.e+t.f),
		new Matrix2D( t.a,t.d,   t.b,t.e,  t.c,t.f),
		new Matrix2D(-t.c,-t.f,  t.b,t.e,  t.a+t.c,t.d+t.f),
		new Matrix2D(-t.a,-t.d,  t.b,t.e,  t.a,t.d),
		new Matrix2D( t.c,t.f,   t.b,t.e,  0,0)
	];

	this.faceIndices = [];
	var i = this.faces.length;
	while (i--){
		if (Environment.isFaceFrontFacing( this.faces[i] )){
			this.faceIndices.push(i);
		}
	}
};

function BlockTexture(image, x, y, width, height, faceMapping){
	this.image = image;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.faceMapping = faceMapping || [0,1,2,3,4,5];
}

BlockTexture.prototype.draw = function(faceIndex){
	var srcX = this.x + this.faceMapping[faceIndex] * this.width; 
	env.context.drawImage(this.image, srcX,this.y, this.width,this.height, 0,0, env.scale,env.scale);
};

function Block(loc, texture){
	this.location = loc;
	this.placement = this.location.clone();
	this.texture = texture;
}

Block.prototype.place = function(){
	this.placement.copy(this.location);
	env.transform.transformPoint(this.placement);
	this.placement.scale(env.scale);
	return this;
};

Block.prototype.draw = function(){
	var i = env.faceIndices.length;
	while (i--){
		this.drawFace( env.faceIndices[i] );
	}
};

Block.prototype.drawFace = function(index){
	var m = env.faces[index];
	var x = this.placement.x + env.origin.x + m.x * env.scale;
	var y = this.placement.y + env.origin.y + m.y * env.scale;
	env.context.setTransform(m.a, m.b, m.c, m.d, x, y);
	this.texture.draw(index);
};

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