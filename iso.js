var textures = null;
var env = null;

function init(){
	textures = new Image();
	textures.onload = texturesLoaded;
	textures.src = "sides.fw.png";
}

function texturesLoaded(){
	env = new Environment("canvas");

	var numbers = new BlockTexture(textures, 0,0,100,100);

	var fence = new BlockTexture(textures, 0,100,25,25, [null,null,0,null,0,null]);
	var grass = new BlockTexture(textures, 25,100,25,25, [0,1,2,2,2,2]);

	// DEBUG: dynamic texture editing
	var c = numbers.getDrawingContext(4);
	c.save();
	c.beginPath();
	c.rect(0,0,numbers.width,numbers.height);
	c.clip();
	c.fillStyle = "rgba(0,0,255,0.25)";
	c.fillRect(0, 0, 300, 100);
	c.restore();

	env.setBlocks(
		new Block(new Point3D(-1, 0,0), numbers),
		new Block(new Point3D( 0, 0,0), numbers),
		new Block(new Point3D( 0,-1,0), fence, true),
		new Block(new Point3D( 1, 0,0), numbers),
		new Block(new Point3D( 1,-1,0), fence, true),
		new Block(new Point3D( 1, 1,0), numbers),
		new Block(new Point3D(-1, 0,1), grass),
		new Block(new Point3D( 0, 0,1), grass),
		new Block(new Point3D( 1, 0,1), grass)
	);

	document.addEventListener("keydown", handleKeyDown);
	env.canvas.addEventListener("mousemove", handleMouseMove);
}

function handleKeyDown(event){

	switch(event.keyCode){

		case 37: // Left
			if (event.ctrlKey){
				env.spin(1);
			}else{
				env.move(1, 0, 0);
			}
			break;

		case 38: // Up
			if (event.ctrlKey){
				env.tilt(1);
			}else{
				env.move(0, 0, 1);
			}
			break;

		case 39: // Right
			if (event.ctrlKey){
				env.spin(-1);
			}else{
				env.move(-1, 0, 0);
			}
			break;

		case 40: // Down
			if (event.ctrlKey){
				env.tilt(-1);
			}else{
				env.move(0, 0, -1);
			}
			break;
	}
}

function handleMouseMove(event){
	Mouse.get(event);
	env.pointer.x = Mouse.x;
	env.pointer.y = Mouse.y;
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

	this.pointer = new Point2D(0,0);
	this.facesUnderPointer = [];

	this.blocks = [];
	this.faces = [];
	this.visibleFaceIndices = [];
	this.hiddenFaceIndices = [];

	this.transitionTime = 100;
	
	this.animateSpin = null;
	this.spinValue = 0; // value by which angle is based
	this.spinAngle = 0; // actual angle of rotation

	this.animateTilt = null;
	this.tiltSteps = 5;
	this.tiltAngle = 0;
	this.tiltValue = 0;

	this.onFrame = this.onFrame.bind(this);

	// init
	// TODO: don't animate init
	this.spin(0);
	this.tilt(2);

	// constantly update
	this.onFrame();
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
	this.facesUnderPointer.length = 0;
};

Environment.prototype.draw = function(){
	this.clear();

	this.transform.identity();
	this.transform.rotateX(this.tiltAngle);
	this.transform.rotateY(this.spinAngle);
	this.commitTransform();

	this.placeBlocks();
	this.drawBlocks();
	this.drawFocus();

	// show mouse face

	var lastFaceIndex = this.facesUnderPointer.length - 1;
	if (lastFaceIndex >= 0){
		var lastFace = this.facesUnderPointer[lastFaceIndex];

		lastFace.block.updateTransform(this, lastFace.faceIndex);
		this.context.fillStyle = "rgba(255,0,0,0.25)";
		this.context.fillRect(0,0, env.scale,env.scale);
	}
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

	this.visibleFaceIndices.length = 0;
	this.hiddenFaceIndices.length = 0;

	var i = this.faces.length;
	while (i--){
		var face = this.faces[i];
		face.x = this.origin2D.x + face.x * this.scale;
		face.y = this.origin2D.y + face.y * this.scale;

		if (Environment.isFaceFrontFacing(face)){
			this.visibleFaceIndices.push(i);
		}else{
			this.hiddenFaceIndices.push(i);
		}
	}
};

Environment.prototype.placeBlocks = function(blocks){
	for (var i=0, n=this.blocks.length; i<n; i++){
		this.blocks[i].place(this);
	}
};

Environment.prototype.drawBlocks = function(blocks){
	this.blocks.sort(Environment.sortOnPlacedZ);
	for (var i=0, n=this.blocks.length; i<n; i++){
		this.blocks[i].draw(this);
	}
};

Environment.prototype.drawFocus = function(blocks){
	var m = this.faces[0];
	this.context.setTransform(m.a, m.b, m.c, m.d, m.x, m.y);
	this.context.beginPath();
	this.context.arc(0,0, this.scale/4, 0,Math.PI*2);

	this.context.fillStyle = "rgba(0,255,0,0.33)";
	this.context.fill();

	this.context.lineWidth = 3;
	this.context.strokeStyle = "rgba(0,0,0,0.5)";
	this.context.stroke();
};

Environment.prototype.onFrame = function(){
	this.draw();
	requestAnimationFrame(this.onFrame);
}

Environment.prototype.move = function(offX, offY, offZ){
	// TODO: Animate?
	this.origin3D.x += offX;
	this.origin3D.y += offY;
	this.origin3D.z += offZ;
};

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


function BlockTexture(src, x, y, width, height, faceMapping){
	this.src = src;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.faceMapping = faceMapping || [0,1,2,3,4,5];
}

BlockTexture.prototype.hasFace = function(faceIndex){
	return this.faceMapping[faceIndex] != null;
};

BlockTexture.prototype.draw = function(env, faceIndex){
	if (!this.hasFace(faceIndex)){
		return;
	}
	var srcX = this.x + this.faceMapping[faceIndex] * this.width; 
	env.context.drawImage(this.src, srcX,this.y, this.width,this.height, 0,0, env.scale,env.scale);
};

BlockTexture.prototype.enableEditable = function(){
	if (this.src instanceof HTMLCanvasElement){
		// already edit-capable
		return;
	}

	// copy src into editable canvas
	var canvas = document.createElement("canvas");
	canvas.width = this.width * (1 + Math.max.apply(Math, this.faceMapping));
	canvas.height = this.height;

	var context = canvas.getContext("2d");
	context.drawImage(this.src, 
		this.x, this.y, canvas.width, canvas.height,
		0, 0, canvas.width, canvas.height);

	this.src = canvas;
};

BlockTexture.prototype.getDrawingContext = function(faceIndex){
	faceIndex = faceIndex || 0;

	this.enableEditable();
	var context = this.src.getContext("2d");

	if (this.hasFace(faceIndex)){
		var srcX = this.x + this.faceMapping[faceIndex] * this.width; 
		context.setTransform(1,0,0,1, srcX, this.y);
	}
	return context;
};


function Block(loc, texture, twoSided){
	this.location = loc;
	this.placement = this.location.clone();
	this.texture = texture;
	this.twoSided = twoSided || false;
}

Block.prototype.place = function(env){
	this.placement.copy(this.location);
	this.placement.addPoint(env.origin3D);
	env.transform.transformPoint(this.placement);
	this.placement.scale(env.scale);
};

Block.prototype.draw = function(env){
	var i;

	if (this.twoSided){
		i = env.hiddenFaceIndices.length;
		while (i--){
			this.drawFace(env, env.hiddenFaceIndices[i] );
		}
	}

	i = env.visibleFaceIndices.length;
	while (i--){
		this.drawFace(env, env.visibleFaceIndices[i] );
	}
};

Block.prototype.drawFace = function(env, faceIndex){

	var m = this.updateTransform(env, faceIndex);
	if (m){

		if (m.invert()){
			var mousePt = env.pointer.clone();
			m.transformPoint(mousePt);
			if (mousePt.x > 0 && mousePt.x < env.scale && 
				mousePt.y > 0 && mousePt.y < env.scale) {
				env.facesUnderPointer.push(new BlockFace(this, faceIndex));
			}
		}

		this.texture.draw(env, faceIndex);
	}
};

Block.prototype.updateTransform = function(env, faceIndex){
	if (this.texture.hasFace(faceIndex)){
		var m = env.faces[faceIndex].clone();
		m.x += this.placement.x;
		m.y += this.placement.y;
		env.context.setTransform(m.a, m.b, m.c, m.d, m.x, m.y);
		return m;
	}

	return null;
};

function BlockFace(block, faceIndex){
	this.block = block;
	this.faceIndex = faceIndex;
};


init();