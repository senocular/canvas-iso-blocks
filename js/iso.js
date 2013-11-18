/********************\
       APP CODE
/********************/

function App(){
	this.texturesURL = "img/sides.fw.png";
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
};

App.prototype.texturesLoaded = function(){
	this.env = new Environment(this.canvasId);

	var numbers = new BlockTexture(this.textures, BlockTexture.cubeRects(new Rect(0,0,100,100)));
	var fence = new BlockTexture(this.textures, BlockTexture.cubeRects(new Rect(0,100,25,25), [null,null,0,null,0,null]), BlockTexture.FACING_BOTH);
	var grass = new BlockTexture(this.textures, BlockTexture.cubeRects(new Rect(25,100,25,25), [0,1,3,3,2,2]), BlockTexture.FACING_FRONT, false);
	var stone = new BlockTexture(this.textures, BlockTexture.cubeRects(new Rect(125,100,25,25), [0,1,1,1,0,0]), BlockTexture.FACING_FRONT, false);
	var steps = new BlockTexture(this.textures, [
		new Rect(0,125,100,33),
		new Rect(100,125,100,33),
		new Rect(200,125,100,17),
		new Rect(300,125,33,17),
		new Rect(333,125,100,17),
		new Rect(433,125,33,17)
		], BlockTexture.FACING_FRONT, true);

	this.env.layout.setItems([
		new Block(new Point3D( 1,-1, 0), fence),
		new Block(new Point3D( 2,-1, 0), fence),
		new Block(new Point3D( 0, 0, 0), numbers),
		new Block(new Point3D( 1, 0, 0), numbers),
		new Block(new Point3D( 2, 0, 0), numbers),
		new Block(new Point3D( 0, 0, 1), grass),
		new Block(new Point3D( 1, 0, 1), grass),
		new Block(new Point3D( 2, 0, 1), grass),
		new Block(new Point3D( 0, 1, 0), numbers),
		new Block(new Point3D( 2, 1, 0), numbers),
		new BlockLayout(new Point3D( 0,-1, 0), 25, [
			new Block(new Point3D( 0, 3, 0), stone),
			new Block(new Point3D( 0, 2, 0), stone),
			new Block(new Point3D( 0, 1, 0), stone),
			new Block(new Point3D( 0, 0, 0), stone),
			new Block(new Point3D( 0, 0, 1), stone),
			new Block(new Point3D( 0, 0, 2), stone),
			new Block(new Point3D( 0, 0, 3), stone),
			new Block(new Point3D( 0, 1, 3), stone),
			new Block(new Point3D( 0, 2, 3), stone),
			new Block(new Point3D( 0, 3, 3), stone)
		]),
		new BlockLayout(new Point3D( 0, 0, 2), new Point3D(100,100/6,100/3), [
			new Block(new Point3D( 0, 0, 0), steps),
			new Block(new Point3D( 0, 1, 1), steps),
			new Block(new Point3D( 0, 2, 2), steps)
		])
	]);
	
	document.addEventListener("keydown", this.handleKeyDown);
	this.env.canvas.addEventListener("mousedown", this.handleMouseDown);
	this.env.canvas.addEventListener("mousemove", this.handleMouseMove);
	document.addEventListener("mouseup", this.handleMouseUp);
};

App.prototype.handleKeyDown = function(event){

	var preventDefault = false;
	switch(event.keyCode){

		case 33: // Page Up
			this.env.moveY.adjust(1);
			preventDefault = true;
			break;

		case 34: // Page Down
			this.env.moveY.adjust(-1);
			preventDefault = true;
			break;

		case 37: // Left
			if (event.ctrlKey){
				this.env.spin.adjust(1);
			}else{
				this.env.moveX.adjust(1);
			}
			preventDefault = true;
			break;

		case 38: // Up
			if (event.ctrlKey){
				this.env.tilt.adjust(1);
			}else{
				this.env.moveZ.adjust(1);
			}
			preventDefault = true;
			break;

		case 39: // Right
			if (event.ctrlKey){
				this.env.spin.adjust(-1);
			}else{
				this.env.moveX.adjust(-1);
			}
			preventDefault = true;
			break;

		case 40: // Down
			if (event.ctrlKey){
				this.env.tilt.adjust(-1);
			}else{
				this.env.moveZ.adjust(-1);
			}
			preventDefault = true;
			break;
	}

	if (preventDefault){
		event.preventDefault();
	}
};

App.prototype.handleMouseDown = function(event){
	this.env.pointerDown = true;
	event.preventDefault();
};

App.prototype.handleMouseMove = function(event){
	this.env.updatePointer( Mouse.get(event) );
	event.preventDefault();
};

App.prototype.handleMouseUp = function(event){
	this.env.pointerDown = false;
	event.preventDefault();
};


/********************\
        CLASSES
/********************/

function Environment(canvasId){
	this.canvas = document.getElementById(canvasId);
	this.context = this.canvas.getContext("2d");
	this.context.imageSmoothingEnabled = false;

	this.origin = new Point2D(this.canvas.width/2, this.canvas.height/2);
	this.viewTransform = new Matrix3D();

	this.pointer = new Point2D(0,0);
	this.lastPointer = new Point2D(0,0);
	this.pointerDown = false;
	this.facesUnderPointer = [];
	this.lastFacesUnderPointer = [];

	this.layout = new BlockLayout();

	this.faceTransforms = [];
	this.visibleFaceIndices = [];
	this.hiddenFaceIndices = [];

	this.transitionTime = 100;
	
	this.spin = new SpinMotion(100);
	this.tilt = new TiltMotion(100);
	this.moveX = new Motion(100);
	this.moveY = new Motion(100);
	this.moveZ = new Motion(100);

	this.onframe = this.onframe.bind(this);

	// init
	this.tilt.adjust(7);
	this.spin.adjust(0);

	// constantly update
	this.onframe();
}

Environment.isFaceFrontFacing = function(m){
	return m.a*m.d - m.b*m.c > 0;
};
Environment.prototype.updatePointer = function(pt){
	this.lastPointer.copy(this.pointer);
	this.pointer.copy(pt);
};

Environment.prototype.onframe = function(){
	this.draw();
	requestAnimationFrame(this.onframe);
};

Environment.prototype.draw = function(){
	this.clearCanvas();

	this.tilt.stepFrame();
	this.spin.stepFrame();

	this.moveX.stepFrame();
	this.moveY.stepFrame();
	this.moveZ.stepFrame();
	var movePt = new Point3D(this.moveX.value-0.5, this.moveY.value, this.moveZ.value-0.5); // -0.5 offset centers

	this.viewTransform.identity();
	this.viewTransform.rotateX(this.tilt.value);
	this.viewTransform.rotateY(this.spin.value);
	this.commitViewTransform();

	this.layout.origin.copy(movePt);

	this.layout.draw(this);
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

Environment.prototype.clearCanvas = function(){
	this.context.setTransform(1,0,0,1,0,0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.lastFacesUnderPointer.length = 0;
	this.lastFacesUnderPointer.push.apply(this.lastFacesUnderPointer, this.facesUnderPointer);
	this.facesUnderPointer.length = 0;
};

Environment.prototype.commitViewTransform = function(){
	var t = this.viewTransform;
	this.faceTransforms = [
		new Matrix2D( t.a,t.d,   t.c,t.f,  0,0),
		new Matrix2D( t.a,t.d,  -t.c,-t.f, t.b+t.c,t.e+t.f),
		new Matrix2D( t.a,t.d,   t.b,t.e,  t.c,t.f),
		new Matrix2D(-t.c,-t.f,  t.b,t.e,  t.a+t.c,t.d+t.f),
		new Matrix2D(-t.a,-t.d,  t.b,t.e,  t.a,t.d),
		new Matrix2D( t.c,t.f,   t.b,t.e,  0,0)
	];

	this.visibleFaceIndices.length = 0;
	this.hiddenFaceIndices.length = 0;

	var i = this.faceTransforms.length;
	while (i--){
		if (Environment.isFaceFrontFacing( this.faceTransforms[i] )){
			this.visibleFaceIndices.push(i);
		}else{
			this.hiddenFaceIndices.push(i);
		}
	}
};

Environment.prototype.drawBlockFace = function(face){

	// determine if face is under pointer
	var faceAntiTransform = face.transform.clone();
	faceAntiTransform.x += this.origin.x;
	faceAntiTransform.y += this.origin.y;
	if (faceAntiTransform.invert()){
		var mousePt = this.pointer.clone();
		faceAntiTransform.transformPoint(mousePt);
		if (mousePt.x > 0 && mousePt.x < face.size.x && 
			mousePt.y > 0 && mousePt.y < face.size.y) {
			this.facesUnderPointer.push(face);
		}
	}

	// perform rendering to screen
	var texture = face.block.texture;
	var textureRect = texture.getFaceRect(face.index);
	if (textureRect){
		this.updateCanvasTransform(face.transform);
		this.context.drawImage(texture.src, 
			textureRect.x, textureRect.y, textureRect.width, textureRect.height,
			0, 0, face.size.x, face.size.y);
	}
};

Environment.prototype.updateCanvasTransform = function(m){
	this.context.setTransform(m.a, m.b, m.c, m.d, this.origin.x + m.x, this.origin.y + m.y);
};

Environment.prototype.drawFocus = function(blocks){
	// KLUDGE: this is just hacked in to show the origin
	var m = this.faceTransforms[0];

	var x = this.origin.x + m.x * this.layout.itemSize.x;
	var y = this.origin.y + m.y * this.layout.itemSize.y;
	var minSize = Math.min(this.layout.itemSize.x, this.layout.itemSize.y);
	this.context.setTransform(m.a, m.b, m.c, m.d, x, y);
	this.context.beginPath();
	this.context.arc(0,0, minSize/4, 0,Math.PI*2);

	this.context.fillStyle = "rgba(0,255,0,0.33)";
	this.context.fill();

	this.context.lineWidth = 3;
	this.context.strokeStyle = "rgba(0,0,0,0.5)";
	this.context.stroke();
};

Environment.prototype.getPointerFace = function(faceList){
	if (!faceList){
		faceList = this.facesUnderPointer;
	}

	var topFaceIndex = faceList.length - 1;
	if (topFaceIndex >= 0){
		return faceList[topFaceIndex];
	}

	return null;
};

Environment.prototype.highlightFace = function(face){
	var fillStyle = "rgba(255,0,0,0.25)";

	this.updateCanvasTransform(face.transform);
	this.context.fillStyle = fillStyle;
	this.context.fillRect(0, 0, face.size.x, face.size.y);
};

Environment.prototype.drawPointerLine = function(face){
	var lineWidth = 10;
	var lineCap = "round";
	var strokeStyle = "#000";

	var texture = face.block.texture;
	var textureRect = texture.getFaceRect(face.index);
	var faceContext = texture.getDrawingContextForFace(face.index);

	if (!faceContext){
		// drawing may not be allowed
		return;
	}

	var faceAntiTransform = face.transform.clone();
	faceAntiTransform.x += this.origin.x;
	faceAntiTransform.y += this.origin.y;

	if (faceAntiTransform.invert()){
		// block size to texture size scaling (not applied to translation)
		var textureScaleX = textureRect.width/face.size.x;
		var textureScaleY = textureRect.height/face.size.y;
		faceAntiTransform.scale(textureScaleX, textureScaleY);

		var movePt = this.lastPointer.clone();
		var linePt = this.pointer.clone();
		faceAntiTransform.transformPoint(movePt);
		faceAntiTransform.transformPoint(linePt);

		// in case width != height, the values are averaged
		var textureFactor = Math.max(textureRect.width + textureRect.height);
		var faceFactor = Math.max(face.size.x + face.size.y);
		var lineScaleFactor = textureFactor/faceFactor;

		faceContext.lineWidth = lineWidth * lineScaleFactor;
		faceContext.lineCap = lineCap;
		faceContext.strokeStyle = strokeStyle;

		faceContext.beginPath();
		faceContext.moveTo(movePt.x, movePt.y);
		faceContext.lineTo(linePt.x, linePt.y);

		faceContext.stroke();
	}

	// getDrawingContextForFace saves the context because
	// it clips, so the state should be popped from the
	// stack when we're done with it
	faceContext.restore(); 
};


function Motion(transitionTime){
	this.transitionTime = transitionTime;

	this.step = 0; // value by which angle is based
	this.value = 0; // actual angle of rotation
	this.animate = null;
}

Motion.prototype.adjust = function(offset){
	this.updateStep(offset);

	if (this.animate){
		this.animate.stop();
	}
	
	this.animate = new Animate(this, "value", this.getToValue(), this.transitionTime);
};

Motion.prototype.updateStep = function(offset){
	this.step += offset;
};

Motion.prototype.getToValue = function(){
	return this.step;
};

Motion.prototype.stepFrame = function(){
	if (this.animate){
		this.animate.stepFrame();

		if (!this.animate.isPlaying()){
			this.animate = null;
		}
	}
};

Motion.prototype.stepFrame = function(){
	if (this.animate){
		this.animate.stepFrame();

		if (!this.animate.isPlaying()){
			this.animate = null;
		}
	}
};


function SpinMotion(transitionTime){
	Motion.call(this, transitionTime);
}
SpinMotion.prototype = Object.create(Motion.prototype);

SpinMotion.prototype.getToValue = function(offset){
	return Math.PI/4 + this.step * Math.PI/10;
};


function TiltMotion(transitionTime){
	Motion.call(this, transitionTime);
	this.totalSteps = 10; // positions between end points
}
TiltMotion.prototype = Object.create(Motion.prototype);

TiltMotion.prototype.updateStep = function(offset){
	var newStep = this.step + offset;
	if (newStep < 0){
		newStep = 0;
	}else if (newStep > this.totalSteps){
		newStep = this.totalSteps;
	}
	this.step = newStep;
};

TiltMotion.prototype.getToValue = function(){
	return Math.PI/2 - this.step * Math.PI/(this.totalSteps);
};


function BlockLayoutItem(location){
	this.location = location || new Point3D(0,0,0);
	this.placement = this.location.clone();
}

BlockLayoutItem.prototype.place = function(env, layout){
	this.placement.copy(this.location);
	this.placement.addPoint(layout.origin);
	this.placement.scalePoint(layout.itemSize);
	env.viewTransform.transformPoint(this.placement);
	this.placement.addPoint(layout.placement);
};

BlockLayoutItem.prototype.draw = function(env){
	// noop; to be overridden
};


function BlockLayout(location, itemSize, items){
	BlockLayoutItem.call(this, location);
	if (typeof itemSize === "number"){
		this.itemSize = new Point3D(itemSize,itemSize,itemSize);
	}else{
		this.itemSize = itemSize || new Point3D(100,100,100);
	}
	this.items = [];
	if (items){
		this.setItems(items);
	}
	this.origin = new Point3D(0,0,0);
}
BlockLayout.prototype = Object.create(BlockLayoutItem.prototype);


BlockLayout.sortOnPlacedZ = function(a, b){
	return a.placement.z - b.placement.z;
};

BlockLayout.prototype.setItems = function(items){
	this.items.length = 0;
	this.items.push.apply(this.items, items);
};

BlockLayout.prototype.draw = function(env){
	this.placeItems(env);
	this.drawItems(env);
};

BlockLayout.prototype.placeItems = function(env){
	for (var i=0, n=this.items.length; i<n; i++){
		this.items[i].place(env, this);
	}
	this.items.sort(BlockLayout.sortOnPlacedZ);
};

BlockLayout.prototype.drawItems = function(env){
	for (var i=0, n=this.items.length; i<n; i++){
		this.items[i].draw(env);
	}
};


function Block(location, texture){
	BlockLayoutItem.call(this, location);
	this.texture = texture;
	this.faces = [null,null,null,null,null,null];
	this.generateFaces();
}
Block.prototype = Object.create(BlockLayoutItem.prototype);

Block.faceLocations = [
	new Point3D(0,0,0),
	new Point3D(0,1,1),
	new Point3D(0,0,1),
	new Point3D(1,0,1),
	new Point3D(1,0,0),
	new Point3D(0,0,0)
];

Block.prototype.generateFaces = function(){
	var i = this.faces.length;
	while (i--){
		if (this.texture.hasFace(i)){
			this.faces[i] = new BlockFace(this, i, Block.faceLocations[i]);
		}
	}
};

Block.prototype.place = function(env, layout) {
	BlockLayout.prototype.place.call(this, env, layout);

	var i = this.faces.length;
	while (i--){
		var face = this.faces[i];
		if (face){
			face.place(env, layout);	
		}
	}
};

Block.prototype.draw = function(env){
	if (this.texture.sidedness & BlockTexture.FACING_BACK){
		this.drawFaces(env, env.hiddenFaceIndices);
	}

	if (this.texture.sidedness & BlockTexture.FACING_FRONT){
		this.drawFaces(env, env.visibleFaceIndices);
	}
};

Block.prototype.drawFaces = function(env, indicesList){
	var i = indicesList.length;
	while (i--){
		var face = this.faces[ indicesList[i] ];
		if (face){
			env.drawBlockFace(face);
		}
	}
};


function BlockTexture(src, rects, sidedness, allowEditable){
	if (rects instanceof Array === false){
		rects = [rects];
	}

	this.src = src;
	this.rects = rects;
	this.sidedness = sidedness || BlockTexture.FACING_FRONT;
	this.allowEditable = allowEditable == undefined ? true : allowEditable;
}

BlockTexture.FACING_FRONT = 1;
BlockTexture.FACING_BACK = 2;
BlockTexture.FACING_BOTH = 3;

BlockTexture.cubeRects = function(rect, mapping){
	if (!mapping){
		mapping = [0,1,2,3,4,5];
	}
	var rects = [];
	var i = 6;
	while(i--){
		var offset = mapping[i];
		if (offset != null){
			var faceRect = rect.clone();
			faceRect.x +=  offset * rect.width;
			rects[i] = faceRect;
		}
	}
	return rects;
}

BlockTexture.prototype.hasFace = function(faceIndex){
	return this.rects[faceIndex] != null;
};

BlockTexture.prototype.getFaceRect = function(faceIndex){
	if (!this.hasFace(faceIndex)){
		return null;
	}

	return this.rects[faceIndex].clone();
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
	var rectSize = this.getEditableTextureSize();
	canvas.width = rectSize.x;
	canvas.height = rectSize.y;
	this.copyTexturesToEditable(canvas);

	this.src = canvas;
	return true;
};

BlockTexture.prototype.getEditableTextureSize = function(){
	var totalWidth = 0;
	var maxHeight = 0;

	for (var i=0, n=this.rects.length; i<n; i++){
		var rect = this.rects[i];
		if (rect){
			totalWidth += rect.width;
			if (rect.height > maxHeight){
				maxHeight = rect.height;
			}
		}
	}

	return new Point2D(totalWidth, maxHeight);
};

BlockTexture.prototype.copyTexturesToEditable = function(canvas){

	var totalWidth = 0;
	var context = canvas.getContext("2d");
	context.imageSmoothingEnabled = false;

	for (var i=0, n=this.rects.length; i<n; i++){
		var rect = this.rects[i];
		if (rect){

			var x = totalWidth;
			var y = 0;
					
			context.drawImage(this.src, 
				rect.x, rect.y, rect.width, rect.height,
				x, y, rect.width, rect.height);

			rect.x = x;
			rect.y = y
			totalWidth += rect.width;
		}
	}
};

BlockTexture.prototype.getDrawingContextForFace = function(faceIndex, isClipped){
	if (!this.allowEditable){
		return null;
	}

	if (!this.enableEditable()){
		return null;
	}

	faceIndex = faceIndex || 0;
	if (isClipped == undefined){
		isClipped = true;
	}

	var context = this.src.getContext("2d");
	context.save();

	if (this.hasFace(faceIndex)){
		// move transform to face location
		var faceRect = this.getFaceRect(faceIndex);
		context.setTransform(1,0,0,1, faceRect.x, faceRect.y);

		if (isClipped){
			// clip texture to the face
			// position already defined by tansform
			context.beginPath();
			context.rect(0, 0, faceRect.width, faceRect.height);
			context.clip();
		}
	}
	return context;
};


function BlockFace(block, index, location){
	this.block = block;
	this.index = index;
	this.location = location;
	this.placement = this.location.clone(); // TODO: consolidate like-placements in same layout; size too?
	this.size = new Point2D(100,100);
	this.transform = new Matrix2D();
};

BlockFace.prototype.place = function(env, layout){
	this.setSize(layout.itemSize);
	this.transform.copy( env.faceTransforms[this.index] );

	this.placement.copy(this.location);
	this.placement.scalePoint(layout.itemSize);
	env.viewTransform.transformPoint(this.placement); // TODO: reduce multiple, nested view transforms
	this.placement.addPoint(this.block.placement);

	this.transform.x = this.placement.x;
	this.transform.y = this.placement.y;
};

BlockFace.prototype.setSize = function(blockSize){
	switch (this.index){
		case 0:
		case 1:
			this.size.x = blockSize.x;
			this.size.y = blockSize.z;
			break;
		case 2:
		case 4:
			this.size.x = blockSize.x;
			this.size.y = blockSize.y;
			break;
		case 3:
		case 5:
			this.size.x = blockSize.z;
			this.size.y = blockSize.y;
			break;
	}
}


var app = new App().init();