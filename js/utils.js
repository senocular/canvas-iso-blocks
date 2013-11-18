function Animate(target, property, toValue, duration){
	this.target = target;
	this.property = property;
	this.fromValue = this.target[this.property];
	this.toValue = toValue;
	this.valueRange = this.toValue - this.fromValue;
	this.duration = duration;
	this.progress = 0;
	this.startTime = Date.now();
	this.endTime = this.startTime + this.duration;
	this.onframe = null;
	this.oncomplete = null;
}

Animate.prototype.stop = function(){
	this.endTime = -1;
};

Animate.prototype.isPlaying = function(){
	return this.endTime !== -1;
};

Animate.prototype.stepFrame = function(){
	if (!this.isPlaying()){
		return; // stopped
	}

	var currTime = Date.now();
	if (currTime > this.endTime){
		currTime = this.endTime;
	}

	this.progress = (currTime - this.startTime)/this.duration;
	this.progress = Math.sqrt(this.progress); // easing

	this.target[this.property] = this.fromValue + this.progress * this.valueRange;

	if (this.onframe){
		this.onframe(this);
	}

	if (currTime === this.endTime){
		if (this.oncomplete){
			this.oncomplete(this);
		}
		this.stop();
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