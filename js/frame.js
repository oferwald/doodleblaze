//------------------------------------------------------------------------------
// Movie
//------------------------------------------------------------------------------

function Movie() {
    this.stage = {
        x: 180,
        y: 100, //TODO: ste proportionally to size
        width: 400,
        height: 300
    };
    this.frames = [];
    this.fps = 8;
    this.currentframe = 0;
    this.playing = false;
    this.playingframe = 0;
}

Movie.prototype.setStage = function (paper) {
    this.paper = paper;
}
Movie.prototype.addFrame = function() {
    var frame = new Frame(this);
    this.frames.push(frame);
    this.selectFrame(this.frames.length - 1, this.paper);
    frame.updateThumb(this.stage, this.frames.length - 1);
};

Movie.prototype.copyFrame = function(sourceframe) {
    if (sourceframe === this.currentframe)
        return; //no point of copying self
    this.currentFrame().load(this.frames[sourceframe].save());
};

Movie.prototype.delFrame = function(num) {
    this.frames[num].remove();
    this.frames.splice(num,1);
};

Movie.prototype.del = function() {
    var i = this.frames.length;
    while (i--) {
        this.delFrame(i);
    }
    this.currentframe = 0;
};

/**
 * 
 * @returns Frame
 */
Movie.prototype.currentFrame = function() {
    return this.frames[this.currentframe];
};

Movie.prototype.cleanStage = function(paper) {
    var len = this.frames.length;
    while (len--) {
        this.frames[len].removeFromStage(paper);
    }
};

Movie.prototype.updateThumbs = function() {
    var len = this.frames.length;
    while (len--) {
        this.frames[len].updateThumb(this.stage,len);
    }
};

Movie.prototype.selectFrame = function(num, paper) {
    if (num > this.frames.length) return;
    var toselect = num;// || this.currentframe;
    selected_shape = null;

    // improve
    $(".frame").parents("td").removeClass("selected");

    this.currentFrame().removeFromStage(paper);

    if (paper.onion) {
        if (this.currentframe) {
            this.frames[this.currentframe - 1].removeFromStage(paper);
        }
        if (toselect) {
            this.frames[toselect - 1].onionSkin(0.4);
        }
    }

    this.currentframe = toselect;
    this.currentFrame().addToStage(paper);
    $(this.currentFrame().thumb).addClass("selected");
};

Movie.prototype.save = function() {
    var len = this.frames.length;
    var save = [];
    while (len--) {
        save.unshift(this.frames[len].save());
    }
    return {
        stage: this.stage,
        fps: this.fps,
        frames: save
    };
};

Movie.prototype.load = function(src) {
    var len = src.frames.length;
    for (var i = 0; i < len; i++) {
        this.addFrame();
        this.currentFrame().load(src.frames[i]);
    }
};

Movie.prototype.stop = function() {
    this.playing = false;
};

Movie.prototype.play = function(paper) {
    this.playing = true;
    paper.setViewBox(this.stage.x, this.stage.y, this.stage.width, this.stage.height);
    this._play(paper);
};

Movie.prototype._play = function(paper) {
    if (++this.playingframe >= this.frames.length) {
        this.playingframe = 0;
    }
    if (this.playing) {
        this.selectFrame(this.playingframe, paper);
        var a = this;
        setTimeout(function() {
            a._play(paper);
        }, 1000 / this.fps);
    } else {
        this.frames[this.playingframe].removeFromStage(paper);
    }
};
//------------------------------------------------------------------------------
// Frame
//------------------------------------------------------------------------------

function Frame(movie) {
    this.figures = [];
    this.thumb = $('<td style="xborder"><div class="rolltop"><div class="rollmid"><div class="frame">');
    $('#next').before(this.thumb);
    this.canvas = Raphael($(this.thumb).find(".frame")[0]);//, 120, 100);
    this.canvas.id = "t";  // num?
    this.movie = movie;
}

Frame.prototype.save = function() {
    var len = this.figures.length;
    var save = [];
    while (len--) {
        save.unshift(this.figures[len].save());
    }
    return {
        figures: save
    };
};

Frame.prototype.load = function(src) {
    var len = src.figures.length;
    for (i = 0; i < len; i++) {
        this.addFigure(src.figures[i]);
    }
};

Frame.prototype.addFigure = function(figure) {
    fg = new Figure();
    //if ($(this).data("libindex") !== 0) { //blank!
    fg.load(figure);//.save());
    //}
//            fig_list.push(new Figure(fg));
    this.figures.push(fg);
    fg.addpaper(this.movie.paper);
    fg.addpaper(this.canvas);
    fg.renderAll();

};

Frame.prototype.remove = function() {
    var i = this.figures.length;
    while (i--) {
        this.delFigure(i);
    }
    this.canvas.remove();
    this.thumb.remove();
};

Frame.prototype.delFigure = function(num) {
    this.figures[num].delete();
    this.figures.splice(num,1);

};

Frame.prototype.removeFromStage = function(paper) {
    for (var i = 0; i < this.figures.length; i++) {
        this.figures[i].removepaper(paper);
        //  this.figures[i].renderAll(); //???
    }
};

Frame.prototype.addToStage = function(paper) {
    for (var i = 0; i < this.figures.length; i++) {
        this.figures[i].addpaper(paper);
        this.figures[i].renderAll();
    }
};

Frame.prototype.onionSkin = function(opacity) {
    for (var i = 0; i < this.figures.length; i++) {
        this.figures[i].renderOnion(this.movie.paper, opacity);
    }

};

Frame.prototype.updateThumb = function(stage, num) {
    this.canvas.setViewBox(stage.x, stage.y, stage.width, stage.height, true);
    // The frame number
    if (!$(this.thumb).data("added_name")) {

        var text = this.canvas.text(stage.x + stage.width / 2, stage.y + stage.height / 2, num + 1)
                .attr("font-size", stage.height / 3 * 2)
                .attr("fill", "#bbbbbb")
                .attr("stroke", "#bbbbbb").toBack();
        $(this.thumb).data("added_name", text);
    } else {
        $(this.thumb).data("added_name")
                .attr('x', stage.x + stage.width / 2)
                .attr('y', stage.y + stage.height / 2)
                .attr("font-size", Math.max(stage.height / 3 * 2, stage.width / 3 * 2));
    }
};
