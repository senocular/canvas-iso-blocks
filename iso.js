var textures = null;
var env = null;

function init(){
	textures = new Image();
	textures.onload = texturesLoaded;
	textures.src = "sides.fw.png";
}

function texturesLoaded(){
	env = new Environment("canvas");

	var texture = new BlockTexture(textures, 0,0,100,100);
	var textureRepeated = new BlockTexture(textures, 0,0,100,100, [0,1,2,2,2,2]);

	env.setBlocks(
		new Block(new Point3D( 0,0,0), texture),
		new Block(new Point3D( 1,0,0), texture),
		new Block(new Point3D(-1,0,0), texture),
		new Block(new Point3D( 1,1,0), textureRepeated)
	);

	document.addEventListener("keydown", handleKeyDown);
}

function handleKeyDown(event){

	switch(event.keyCode){

		case 37: // Left
			env.spin(1);
			break;
		case 38: // Up
			env.tilt(1);
			break;
		case 39: // Right
			env.spin(-1);
			break;
		case 40: // Down
			env.tilt(-1);
			break;
	}
}


/********************\
		CLASSES
/********************/

function Environment(canvasId){
	this.canvas = document.getElementById(canvasId);
	this.context = this.canvas.getContext("2d");

	this.origin2D = new Point2D(this.canvas.width/2, this.canvas.height/2);
	this.origin3D = new Point3D(-0.5, 0, -0.5);
	this.transform = new Matrix3D();
	this.scale = 100;

	this.blocks = [];
	this.faces = [];
	this.faceIndices = [];

	this.transitionTime = 100;
	
	this.animateSpin = null;
	this.spinValue = 0; // value by which angle is based
	this.spinAngle = 0; // actual angle of rotation

	this.animateTilt = null;
	this.tiltSteps = 5;
	this.tiltAngle = 0;
	this.tiltValue = 0;

	this.drawFrame = this.drawFrame.bind(this);

	// init
	// TODO: don't animate init
	this.spin(0);
	this.tilt(2);

	// constantly update
	this.drawFrame();
}

Environment.isFaceFrontFacing = function(m){
	return m.a*m.d - m.b*m.c > 0;
};

Environment.sortOnPlacedZ = function(a, b){
	return a.placement.z - b.placement.z;
};

Environment.prototype.setBlocks = function(/* args */){
	this.blocks.length = 0;
	this.blocks.push.apply(this.blocks, arguments);
};

Environment.prototype.clear = function(){
	this.context.setTransform(1,0,0,1,0,0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Environment.prototype.draw = function(){
	this.clear();
	
	this.transform.identity();
	this.transform.rotateX(this.tiltAngle);
	this.transform.rotateY(this.spinAngle);
	this.commitTransform();

	this.placeBlocks();
	this.drawBlocks();
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
		var face = this.faces[i];
		if (Environment.isFaceFrontFacing(face)){
			face.x = this.origin2D.x + face.x * this.scale;
			face.y = this.origin2D.y + face.y * this.scale;
			this.faceIndices.push(i);
		}
	}
};

Environment.prototype.placeBlocks = function(blocks){
	for (var i=0, n=this.blocks.length; i<n; i++){
		this.blocks[i].place();
	}
};

Environment.prototype.drawBlocks = function(blocks){
	this.blocks.sort(Environment.sortOnPlacedZ);
	for (var i=0, n=this.blocks.length; i<n; i++){
		this.blocks[i].draw();
	}
};

Environment.prototype.drawFrame = function(){
	this.draw();
	requestAnimationFrame(this.drawFrame);
}

Environment.prototype.spin = function(offset){
	this.spinValue += offset;

	if (this.animateSpin){
		this.animateSpin.stop();
	}
	var targetAngle = Math.PI/4 + this.spinValue * Math.PI/2;
	this.animateSpin = new Animate(this, "spinAngle", targetAngle, this.transitionTime);
};

Environment.prototype.tilt = function(offset){
	this.tiltValue += offset;
	if (this.tiltValue < 0){
		this.tiltValue = 0;
	}else if (this.tiltValue > this.tiltSteps){
		this.tiltValue = this.tiltSteps;
	}

	if (this.animateTilt){
		this.animateTilt.stop();
	}
	var targetAngle = -this.tiltValue * Math.PI/(2 * this.tiltSteps);
	this.animateTilt = new Animate(this, "tiltAngle", targetAngle, this.transitionTime);
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
	if (!this.hasFace(faceIndex)){
		return;
	}
	var srcX = this.x + this.faceMapping[faceIndex] * this.width; 
	env.context.drawImage(this.image, srcX,this.y, this.width,this.height, 0,0, env.scale,env.scale);
};

BlockTexture.prototype.hasFace = function(faceIndex){
	return !isNaN(this.faceMapping[faceIndex]);
};


function Block(loc, texture){
	this.location = loc;
	this.placement = this.location.clone();
	this.texture = texture;
}

Block.prototype.place = function(){
	// TODO: should prob move to env
	this.placement.copy(this.location);
	this.placement.addPoint(env.origin3D);
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
	if (this.texture.hasFace(index)){
		var m = env.faces[index];
		var x = this.placement.x + m.x;
		var y = this.placement.y + m.y;
		env.context.setTransform(m.a, m.b, m.c, m.d, x, y);
		this.texture.draw(index);
	}
};


function Animate(target, property, toValue, duration){
	this.target = target;
	this.property = property;
	this.fromValue = this.target[this.property];
	this.toValue = toValue;
	this.valueRange = this.toValue - this.fromValue;
	this.duration = duration;
	this.startTime = Date.now();
	this.endTime = this.startTime + this.duration;
	this.onstep = null;
	this.oncomplete = null;
	this.update = this.update.bind(this);
	this.update(); // start upon creation
}

Animate.prototype.stop = function(){
	this.endTime = -1;
	this.onstep = null;
	this.oncomplete = null;
};

Animate.prototype.update = function(){

	var currTime = Date.now();
	if (currTime > this.endTime){
		if (this.endTime === -1){
			return; // stopped
		}
		currTime = this.endTime;
	}

	var progress = (currTime - this.startTime)/this.duration;
	progress = Math.sqrt(progress); // easing

	this.target[this.property] = this.fromValue + progress * this.valueRange;

	if (this.onstep){
		this.onstep(this);
	}

	if (currTime === this.endTime){
		if (this.oncomplete){
			this.oncomplete(this);
		}
	}else{
		requestAnimationFrame(this.update);
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
	return this;
};

Point3D.prototype.addPoint = function(pt){
	this.x += pt.x;
	this.y += pt.y;
	this.z += pt.z;
	return this;
};

Point3D.prototype.scale = function(n){
	this.x *= n;
	this.y *= n;
	this.z *= n;
	return this;
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