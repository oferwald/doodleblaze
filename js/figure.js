// -----------------------------------------------------------------------------
// This is the basic shape, from which all other elements are derived;

function Shape() {
}

// get the angle, which is built upon the anchor
Shape.prototype.angle = function() {
    return this.anchor.angle() + this._angle;
};

// this is how a shape is rotated to a given coordinate
Shape.prototype.rotate = function(x, y) {
    var pos = this.anchor.getPos();
    var angle = Math.atan2(y - pos.y, x - pos.x) - this.anchor.angle();
    this._angle = angle;
};
// how to move a shape
Shape.prototype.move = function(x, y) {
    var pos = this.anchor.getPos();
    this.rotate(x, y);
    this.length = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
};

// shape position is relative to its anchor
Shape.prototype.getPos = function() {
    //time for some trigonometry!
    var anchor = this.anchor.getPos();
    var dy = Math.sin(this.angle()) * this.length;
    var dx = Math.cos(this.angle()) * this.length;
    return {x: anchor.x + dx, y: anchor.y + dy};
};
// render this shape and its kids on a given paper
Shape.prototype.renderAll = function() {
    for (var i = 0; i < this.children.length; i++) {
        this.children[i].renderAll();
    }
    this.render();
};

// remove this shape from a paper
Shape.prototype.remove = function(paperid) {
    for (var i = 0; i < this.children.length; i++) {
        this.children[i].remove(paperid);
    }

    if (this.papers[paperid]) {
        this.papers[paperid].remove();
        delete this.papers[paperid];
    }

    if (this.joint && paperid === 'stage') { //not cool!!
        this.joint.remove();
        delete this.joint;
    }
};

// remove this shape from a paper
Shape.prototype.delete = function() {
    var i = this.children.length;
    while (i--) {
        this.children[i].delete();
    }
    for (var i = 0; i < this.root.papers.length; i++) {
        paper = this.root.papers[i];
        this.remove(paper.id);
    }
    if (this.type === 'root') {
    } else {
        var i = this.anchor.children.length;
        while (i--) {
            if (this.anchor.children[i] === this) {
                this.anchor.children.splice(i, 1);
            }
        }
    }
    delete this;
};

// saving the shape to a clean object
Shape.prototype.save = function() {
    for (var i = 0, children = []; i < this.children.length; i++) {
        children.push(this.children[i].save());
    }
    var saved = {};
    // root has its own save, so this is dafe
    if (this.anchor.type !== this.type)
        saved.type = this.type;
    if (this.anchor.length !== this.length)
        saved.length = Math.floor(this.length);
    if (this.anchor.width !== this.width)
        saved.width = this.width;
    if (this.anchor.color !== this.color)
        saved.color = this.color;
    if (this._angle)
        saved.angle = Math.floor(this._angle * (180 / Math.PI));
    if (children.length)
        saved.children = children;
    return saved;
};

// scaling a shape
Shape.prototype.scale = function(scale) {
    for (var i = 0, children = []; i < this.children.length; i++) {
        children.push(this.children[i].scale(scale));
    }
    this.length = Math.floor(this.length * parseInt(scale) / 100);
    this.width = Math.floor(this.width * parseInt(scale) / 100);
};

// getting the shape drawable object from the paper
Shape.prototype.getShape = function(paper) {
    return this.papers[paper.id];
};

// storing the shape drawable object on this shape papers list
Shape.prototype.storeShape = function(paper, shape) {
    this.papers[paper.id] = shape;
};

// handle the handle
Shape.prototype.handle = function(paper) {
    if (paper.editable) {
        var shape = this;
        if (!this.joint) {
            this.joint = paper.ellipse(0, 0, handle_size, handle_size)
                    .attr("fill", "red");
            if (this.type === "root") {
                this.joint.attr("fill", "#FFA500");
            }
            $(this.joint.node).bind(TOUCHSTART, function(e) {
                current_shape = shape;
                selected_shape = shape;
                e.preventDefault();
                e.stopPropagation();
            });
        }
        var pos = this.getPos();
        this.joint
                .attr("cx", pos.x)
                .attr("cy", pos.y).toFront();
    }
};

// -----------------------------------------------------------------------------

//a figure is composed of lines or circles
//each line/circle contains 2 points, one flexible, one anchored to another point
//they all go down to a root point, which has no parent.
function Figure() {
    this.pos = {x: 0, y: 0};
    this._angle = 0;
    this.children = [];
    this.type = "root";
    this.length = 0;
    this.papers = []; //holds raphael canvases this figure is drawn on
    this.root = this;
    // also - might have an id;
}

Figure.prototype = new Shape();

Figure.prototype.load = function(src) {
    if (src.pos) {
        this.pos.x = src.pos[0];
        this.pos.y = src.pos[1];
    }
    if (src._angle) {
        // this._angle = src.angle() / (180 / Math.PI);
        this._angle = src._angle;
    }
    if (src.id)
        this.id = src.id;
    // only used for kids
    if (src.width)
        this.width = src.width;
    if (src.color)
        this.color = src.color;
    (function godown(parent, children) {
        if (children === undefined)
            return;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.type === undefined)
                child.type = parent.type;
            if (child.length === undefined)
                child.length = parent.length;
            if (child.width === undefined)
                child.width = parent.width;
            if (child.color === undefined)
                child.color = parent.color;
            if (child.angle === undefined)
                child.angle = 0;
            var el;
            if (child.type === "line") {
                el = new Line(parent, child.angle, child.length, child.width, child.color);
            } else if (child.type === "circle") {
                el = new Circle(parent, child.angle, child.length, child.width, child.color, child.fill);
            } else if (child.type === "image") {
                el = new Image(parent, child.src, child.angle, child.length, child.width);
            }
            godown(el, child.children); //recurse
        }
    })(this, src.children);
    delete this.width;
    delete this.color;
};

Figure.prototype.save = function() {
    var obj = {
        type: this.type,
        pos: [this.pos.x, this.pos.y]   
    };
    // optimizing ;)
    if (this.children.length) {
        obj.width = this.children[0].width;
        this.width = obj.width;
        obj.color = this.children[0].color;
        this.color = obj.color;
    }
    if (this.id) {
        obj.id = this.id;
    }
    for (var i = 0, children = []; i < this.children.length; i++) {
        children.push(this.children[i].save());
    }
    if (this._angle)
        obj.angle = Math.floor(this._angle * (180 / Math.PI));
    if (children.length) {
        obj.children = children;
    }
    delete this.width;
    delete this.color;
    return obj;
};

Figure.prototype.render = function() {
    for (var i = 0; i < this.papers.length; i++) {
        paper = this.papers[i];
        this.handle(paper);
    }
};

Figure.prototype.getPos = function() {
    return this.pos;
};

Figure.prototype.angle = function() {
    return this._angle;
};

// will only work on paper[0]
Figure.prototype.renderSample = function() {
    this.papers[0].setStart();
    this.renderAll();
    var st = this.papers[0].setFinish();
    // setting the viewbox with a little extra
    this.papers[0].setViewBox(st.getBBox().x - 10, st.getBBox().y - 10, st.getBBox().width + 20, st.getBBox().height + 20, true);
};

//TODO
Figure.prototype.renderOnion = function(paper, opacity) {
    var editable = paper.editable;
    var id = paper.id;
    var deep = deep || ".3";
    this.addpaper(paper);
    paper.editable = false;
    // paper.id = paper.id + "_onion";
    paper.setStart();
    this.renderAll();
    var st = paper.setFinish();
    st.attr("opacity", opacity);
    paper.editable = editable;
};


Figure.prototype.rotate = function(x, y) {
    this.pos = {x: x, y: y};
};

Figure.prototype.move = function(x, y) {
    var pos = this.pos;
    this._angle = Math.atan2(y - pos.x, x - pos.y);
};

// Add a paper
Figure.prototype.addpaper = function(paper) {
    this.papers.push(paper);
};

Figure.prototype.removepaper = function(paper) {
    for (var i = 0; i < this.papers.length; i++) {
        if (this.papers[i].id === paper.id) {
            this.papers.splice(i, 1);
        }
    }
    this.remove(paper.id);
};

// -----------------------------------------------------------------------------

function Line(anchor, angle, length, width, color) {
    //a shape is a rendering of 2 arbitrary points
    this.papers = [];
    this.root = anchor.root;
    this.type = "line";
    this.anchor = anchor; //type = shape.
    this.children = [];
    this.length = length || 50;
    this._angle = angle / (180 / Math.PI);
    // this.shape = draw.path("");
    this.width = width || 6;
    this.color = color || "#000";
    this.anchor.children.push(this);
}

Line.prototype = new Shape();

Line.prototype.getLine = function(paper) {
    var shape = this.getShape(paper);
    if (!shape) {
        shape = paper.path("");
        this.storeShape(paper, shape);
    }
    return shape;
};

Line.prototype.render = function() {
    var anchor = this.anchor.getPos();
    var end = this.getPos();
    for (var i = 0; i < this.root.papers.length; i++) {
        var paper = this.root.papers[i];
        this.getLine(paper)
                .attr("path", "M" + anchor.x + "," + anchor.y + " L" + end.x + "," + end.y)
                .attr('stroke-width', this.width/* + "px"*/)
                .attr('stroke', this.color)
                .attr('stroke-linecap', 'round');
        this.handle(paper);
    }
};

// -----------------------------------------------------------------------------
// Yes, a circle!
function Circle(anchor, angle, length, width, color, fill) {
    //a shape is a rendering of 2 arbitrary points
    this.anchor = anchor;
    this.root = anchor.root;
    this.children = [];
    this.papers = [];
    this.type = "circle";
    this.length = length || 50;
    this._angle = angle / (180 / Math.PI);
    this.width = width || 6;
    this.color = color || "#000";
    this.fill = fill;// || "#FFF";

    this.anchor.children.push(this);

}
Circle.prototype = new Shape();

Circle.prototype.getCircle = function(paper) {
    var shape = this.getShape(paper);
    if (!shape) {
        shape = paper.circle(0, 0, 0);
        this.storeShape(paper, shape);
    }
    return shape;
};

Circle.prototype.render = function() {
    var anchor = this.anchor.getPos();
    var end = this.getPos();
    for (var i = 0; i < this.root.papers.length; i++) {
        paper = this.root.papers[i];
        this.getCircle(paper)
                .attr("r", this.length / 2)
                .attr("cx", (anchor.x + end.x) / 2)
                .attr("cy", (anchor.y + end.y) / 2)
                .attr('stroke-width', this.width/* + "px"*/)
                .attr('stroke', this.color)
                .attr('fill', this.fill);
        this.handle(paper);
    }
};

Circle.prototype.save = function() {
    save = Shape.prototype.save.call(this);
    save.fill = this.fill;
    return save;
};

// -----------------------------------------------------------------------------
// An image
function Image(anchor, src, angle, length, width) {
    //a shape is a rendering of 2 arbitrary points
    var image = this;
    this.anchor = anchor;
    this.root = anchor.root;
    this.papers = [];
    this.children = [];
    this.type = "image";
    this.length = length || 50;
    this._angle = 0;//angle / (180 / Math.PI);
    this.width = width || 6;
    this.src = src || "object-locked.png";  // TODO: Use src

    this.anchor.children.push(this);

}
Image.prototype = new Shape();

Image.prototype.getImage = function(paper) {
    var shape = this.getShape(paper);
    if (!shape) {
        shape = paper.image(this.src, 0, 0, 0, 0);
        this.storeShape(paper, shape);
    }
    return shape;
};

Image.prototype.render = function(paper) {
    var anchor = this.anchor.getPos();
    var end = this.getPos();
    for (var i = 0; i < this.root.papers.length; i++) {
        paper = this.root.papers[i];
        this.getImage(paper)
                .attr("x", anchor.x)
                .attr("y", anchor.y)
                .attr("width", this.length)
                .attr("height", this.length)
                .transform('"r' + Math.floor(this._angle * (180 / Math.PI)) + ',' + anchor.x + ',' + anchor.y + '"');
        this.handle(paper);
    }
};

Image.prototype.save = function() {
    save = Shape.prototype.save.call(this);
    save.src = this.src;
    return save;
};
