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