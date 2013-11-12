/********************\
       APP CODE
/********************/

function App(){
	this.texturesURL = "sides.fw.png";
	this.canvasId = "canvas";

	this.textures = null;
	this.env = null;

	this.texturesLoaded = this.texturesLoaded.bind(this);
	this.handleKeyDown = this.handleKeyDown.bind(this);
	this.handleMouseDown = this.handleMouseDown.bind(this);
	this.handleMouseMove = this.handleMouseMove.bind(this);
	this.handleMouseUp = this.handleMouseUp.bind(this);
}

App.prototype.init = function(){
	this.textures = new Image();
	this.textures.onload = this.texturesLoaded;
	this.textures.src = this.texturesURL;
	return this;
}

App.prototype.texturesLoaded = function(){
	this.env = new Environment(this.canvasId);

	var numbers = new BlockTexture(this.textures, new Rect(0,0,100,100));
	var fence = new BlockTexture(this.textures, new Rect(0,100,25,25), [null,null,0,null,0,null], true);
	var grass = new BlockTexture(this.textures, new Rect(25,100,25,25), [0,1,3,3,2,2], false, false);

	// TODO: use "Layouts" with-sub layouts
	this.env.setBlocks(
		new Block(new Point3D( 0,-1,0), fence),
		new Block(new Point3D( 1,-1,0), fence),
		new Block(new Point3D(-1, 0,0), numbers),
		new Block(new Point3D( 0, 0,0), numbers),
		new Block(new Point3D( 1, 0,0), numbers),
		new Block(new Point3D(-1, 0,1), grass),
		new Block(new Point3D( 0, 0,1), grass),
		new Block(new Point3D( 1, 0,1), grass),
		new Block(new Point3D(-1, 1,0), numbers),
		new Block(new Point3D( 1, 1,0), numbers)
	);

	document.addEventListener("keydown", this.handleKeyDown);
	this.env.canvas.addEventListener("mousedown", this.handleMouseDown);
	this.env.canvas.addEventListener("mousemove", this.handleMouseMove);
	document.addEventListener("mouseup", this.handleMouseUp);
}

App.prototype.handleKeyDown = function(event){

	switch(event.keyCode){

		case 37: // Left
			if (event.ctrlKey){
				this.env.spin(1);
			}else{
				this.env.move(1, 0, 0);
			}
			break;

		case 38: // Up
			if (event.ctrlKey){
				this.env.tilt(1);
			}else{
				this.env.move(0, 0, 1);
			}
			break;

		case 39: // Right
			if (event.ctrlKey){
				this.env.spin(-1);
			}else{
				this.env.move(-1, 0, 0);
			}
			break;

		case 40: // Down
			if (event.ctrlKey){
				this.env.tilt(-1);
			}else{
				this.env.move(0, 0, -1);
			}
			break;
	}
}

App.prototype.handleMouseDown = function(event){
	this.env.pointerDown = true;
	event.preventDefault();
}

App.prototype.handleMouseMove = function(event){
	this.env.updatePointer( Mouse.get(event) );
	event.preventDefault();
}

App.prototype.handleMouseUp = function(event){
	this.env.pointerDown = false;
	event.preventDefault();
}


/********************\
        CLASSES
/********************/

function Environment(canvasId){
	this.canvas = document.getElementById(canvasId);
	this.context = this.canvas.getContext("2d");
	this.context.imageSmoothingEnabled = false;

	this.origin2D = new Point2D(this.canvas.width/2, this.canvas.height/2);
	this.origin3D = new Point3D(-0.5, 0, -0.5);
	this.viewTransform = new Matrix3D();
	this.scale = 100;

	this.pointer = new Point2D(0,0);
	this.lastPointer = new Point2D(0,0);
	this.pointerDown = false;
	this.facesUnderPointer = [];
	this.lastFacesUnderPointer = [];

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
	// TODO: don't animate init?
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

Environment.prototype.updatePointer = function(pt){
	this.lastPointer.copy(this.pointer);
	this.pointer.copy(pt);
};

Environment.prototype.onFrame = function(){
	this.draw();
	requestAnimationFrame(this.onFrame);
};

Environment.prototype.clearCanvas = function(){
	this.context.setTransform(1,0,0,1,0,0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.lastFacesUnderPointer.length = 0;
	this.lastFacesUnderPointer.push.apply(this.lastFacesUnderPointer, this.facesUnderPointer);
	this.facesUnderPointer.length = 0;
};

Environment.prototype.draw = function(){
	this.clearCanvas();

	this.viewTransform.identity();
	this.viewTransform.rotateX(this.tiltAngle);
	this.viewTransform.rotateY(this.spinAngle);
	this.commitViewTransform();

	this.placeBlocks();
	this.drawBlocks();
	this.drawFocus();

	var topFace = this.getPointerFace();
	var lastTopFace = this.getPointerFace(this.lastFacesUnderPointer);

	if (topFace){
		this.highlightFace(topFace);
	}

	// drawing here is applied to textures after
	// the faces are already drawn since the draw
	// loop is the same loop that identifies blocks
	// under the pointer.  Texture updates then only
	// happen in the next frame but its negligible
	if (this.pointerDown){
		
		if (topFace){
			this.drawPointerLine(topFace);
		}

		// if a line is being drawn off a face on to
		// another face, that face will not be pointed
		// at now, but would have in the previous frame
		// we need a second line to continue the line extending
		// off of that face into the new pointer location
		if (lastTopFace && lastTopFace !== topFace){
			this.drawPointerLine(lastTopFace);
		}
	}
};

Environment.prototype.commitViewTransform = function(){
	var t = this.viewTransform;
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
		this.placeBlock( this.blocks[i] );
	}
	this.blocks.sort(Environment.sortOnPlacedZ);
};

Environment.prototype.placeBlock = function(block){
	block.resetPlacement();
	block.placement.addPoint(this.origin3D);
	this.viewTransform.transformPoint(block.placement);
	block.placement.scale(this.scale);
};

Environment.prototype.drawBlocks = function(blocks){
	for (var i=0, n=this.blocks.length; i<n; i++){
		this.drawBlock( this.blocks[i] );
	}
};

Environment.prototype.drawBlock = function(block){
	if (block.texture.twoSided){
		this.drawBlockFaces(block, this.hiddenFaceIndices);
	}

	this.drawBlockFaces(block, this.visibleFaceIndices);
};

Environment.prototype.drawBlockFaces = function(block, indicesList){
	var faceIndex, face;
	var i = indicesList.length;
	while (i--){
		face = block.faces[ indicesList[i] ];
		if (face){
			this.drawBlockFace(face);
		}
	}
};

Environment.prototype.drawBlockFace = function(face){
	var m = this.getFaceTransform(face);
	this.updateCanvasTransform(m);

	// determine if face is under pointer
	if (m.invert()){
		var mousePt = this.pointer.clone();
		m.transformPoint(mousePt);
		if (mousePt.x > 0 && mousePt.x < this.scale && 
			mousePt.y > 0 && mousePt.y < this.scale) {
			this.facesUnderPointer.push(face);
		}
	}

	// perform rendering to screen
	var texture = face.block.texture;
	var rect = texture.getFaceRect(face.index);
	if (rect){
		this.context.drawImage(texture.src, 
			rect.x, rect.y, rect.width, rect.height,
			0,0, this.scale, this.scale);
	}
};

Environment.prototype.getFaceTransform = function(face){
	var m = this.faces[face.index].clone();
	m.x += face.block.placement.x;
	m.y += face.block.placement.y;
	return m;
};

Environment.prototype.updateCanvasTransform = function(m){
	this.context.setTransform(m.a, m.b, m.c, m.d, m.x, m.y);
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

Environment.prototype.getPointerFace = function(list){
	if (!list){
		list = this.facesUnderPointer;
	}

	var topFaceIndex = list.length - 1;
	if (topFaceIndex >= 0){
		return list[topFaceIndex];
	}

	return null;
};

Environment.prototype.highlightFace = function(face){
	var fillStyle = "rgba(255,0,0,0.25)";

	var m = this.getFaceTransform(face);
	this.updateCanvasTransform(m);
	this.context.fillStyle = fillStyle;
	this.context.fillRect(0, 0, this.scale, this.scale);
};

Environment.prototype.drawPointerLine = function(face){
	var lineWidth = 10;
	var lineCap = "round";
	var strokeStyle = "#000";

	var texture = face.block.texture;
	var c = texture.getDrawingContextForFace(face.index);

	if (!c){
		// drawing may not be allowed
		return;
	}

	var m = this.faces[face.index].clone();
	var x = m.x + face.block.placement.x;
	var y = m.y + face.block.placement.y;
	m.scale(this.scale/texture.rect.width, this.scale/texture.rect.height);
	m.x = x; // position is not scaled for the texture matrix
	m.y = y;


	if (m.invert()){
		var movePt = this.lastPointer.clone();
		var linePt = this.pointer.clone();
		m.transformPoint(movePt);
		m.transformPoint(linePt);

		// in case width != height, the values are averaged
		var lineScaleFactor = (texture.rect.width + texture.rect.height)/(2 * this.scale);

		c.lineWidth = lineWidth * lineScaleFactor;
		c.lineCap = lineCap;
		c.strokeStyle = strokeStyle;

		c.beginPath();
		c.moveTo(movePt.x, movePt.y);
		c.lineTo(linePt.x, linePt.y);

		c.stroke();
	}

	// getDrawingContextForFace saves the context because
	// it clips, so the state should be popped from the
	// stack when we're done with it
	c.restore(); 
};

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


function Block(loc, texture){
	this.location = loc;
	this.placement = this.location.clone();
	this.texture = texture;
	this.faces = [];
	this.updateFaces();
}

Block.prototype.updateFaces = function(){
	var i = 6; // 6 sides to a block
	while (i--){
		if (this.texture.hasFace(i)){
			this.faces[i] = new BlockFace(this, i);
		}
	}
};

Block.prototype.resetPlacement = function(){
	this.placement.copy(this.location);
};


function BlockTexture(src, rect, faceMapping, twoSided, allowEditable){
	this.src = src;
	this.rect = rect; // of first face (0)
	this.faceMapping = faceMapping || [0,1,2,3,4,5];
	this.twoSided = twoSided || false;
	this.allowEditable = allowEditable == undefined ? true : allowEditable;
}

BlockTexture.prototype.hasFace = function(faceIndex){
	return this.faceMapping[faceIndex] != null;
};

BlockTexture.prototype.getFaceRect = function(faceIndex){
	if (!this.hasFace(faceIndex)){
		return null;
	}

	var faceRect = this.rect.clone();
	faceRect.x += this.faceMapping[faceIndex] * this.rect.width;
	return faceRect;
};

BlockTexture.prototype.enableEditable = function(){
	if (!this.allowEditable){
		// not allowed to make this editable
		return false;
	}

	if (this.src instanceof HTMLCanvasElement){
		// already edit-capable
		return true;
	}

	// copy src into editable canvas
	var canvas = document.createElement("canvas");
	canvas.width = this.rect.width * (1 + Math.max.apply(Math, this.faceMapping));
	canvas.height = this.rect.height;

	var context = canvas.getContext("2d");
	context.imageSmoothingEnabled = false;
	context.drawImage(this.src, 
		this.rect.x, this.rect.y, canvas.width, canvas.height,
		0, 0, canvas.width, canvas.height);
	
	// with independent canvas src, location
	// of texture is reset to top left
	this.rect.x = 0;
	this.rect.y = 0;

	this.src = canvas;
	return true;
};

BlockTexture.prototype.getDrawingContextForFace = function(faceIndex, clip){
	if (!this.allowEditable){
		return null;
	}

	if (!this.enableEditable()){
		return null;
	}

	faceIndex = faceIndex || 0;
	if (clip == undefined){
		clip = true;
	}

	var context = this.src.getContext("2d");
	context.save();

	if (this.hasFace(faceIndex)){
		// move transform to face location
		var rect = this.getFaceRect(faceIndex);
		context.setTransform(1,0,0,1, rect.x, rect.y);

		if (clip){
			// clip texture to the face
			// position already defined by tansform
			context.beginPath();
			context.rect(0, 0, rect.width, rect.height);
			context.clip();
		}
	}
	return context;
};


function BlockFace(block, index){
	this.block = block;
	this.index = index;
};


var app = new App().init();