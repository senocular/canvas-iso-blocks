function Rect(x, y, width, height){
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

Rect.prototype.clone = function(){
	return new Rect(this.x, this.y, this.width, this.height);
};

function Point2D(x,y){
	this.x = x || 0;
	this.y = y || 0;
}

Point2D.prototype.clone = function(){
	return new Point2D(this.x, this.y);
};

Point2D.prototype.copy = function(pt){
	this.x = pt.x;
	this.y = pt.y;
	return this;
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

Matrix2D.prototype.clone = function() {
	return new Matrix2D(this.a,	this.b,	this.c,	this.d,	this.x,	this.y);
};

Matrix2D.prototype.identity = function() {
	this.a = 1;
	this.b = 0;
	this.c = 0;
	this.d = 1;
	this.x = 0;
	this.y = 0;
};

Matrix2D.prototype.invert = function () {
	var det = this.a * this.d - this.b * this.c;

	if (det !== 0) {
		var a = this.a;
		var b = this.b;
		var c = this.c;
		var d = this.d;
		var x = this.x;
		var y = this.y;

		this.a = d/det;
		this.b = -b/det;
		this.c = -c/det;
		this.d = a/det;
		this.x = (c * y - x * d)/det;
		this.y = (x * b - a * y)/det;

		return true;
	}

	return false;
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

Matrix2D.prototype.transformPoint = function(p){
	var x = p.x;
	var y = p.y;
	p.x = this.x + x*this.a + y*this.c;
	p.y = this.y + x*this.b + y*this.d;
	return p;
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