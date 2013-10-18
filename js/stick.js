TOUCHEND = "mouseup touchend";
TOUCHSTART = "mousedown touchstart";
TOUCHMOVE = "mousemove touchmove";


length_locked = true;

function init_variables() {
    draw = null;
    next_id = 0;
    current_shape = null;
    selected_shape = null; //selected != current
    shadow_shape = null;
    resize_stage = false;
    handle_size = 8;
    onion_skins = [];
    playback = false;
    fps = 15;
    library = [];
    movie = new Movie();
}

function nextid() {
    next_id++;
    return next_id;
}

init_variables();

function render_info() {
    if (shadow_shape) {
        shadow_shape.attr("stroke-width", "1px");
        shadow_shape.attr("stroke", "#000000");
        shadow_shape = null;
    }
    if (selected_shape) {
        $(".shape_selected").show();
        $(".infobox").show();
        $("#type").text(selected_shape.type);
        $(".render").hide();
        $(".render-any").show();
        $(".render-" + selected_shape.type).show();
        $("#angle").text(Math.floor(selected_shape._angle * (180 / Math.PI)));
        $("#length").text(Math.floor(selected_shape.length));
        $("#color").css("color", selected_shape.color);
        $("#width").text(selected_shape.width);

        var sse = selected_shape.joint || selected_shape.shape;
        sse.attr("stroke", "#c598ec");
        sse.attr("stroke-width", "5px");
        shadow_shape = sse;
    } else {
        $(".render").hide();
        $(".render-any").hide();
    }
}

setInterval(render_info, 100);

function picked_color() {
    /* var color = colorpicker.color();
     selected_shape.color = color;*/
    selected_shape.renderAll();
    $("#colorpicker").hide();
}

$("a").live("click", function(e) {
    e.preventDefault();

    return false;
});


$("#canvas").bind("contextmenu", function(e) {
    e.preventDefault();
    return false;
});

$("#canvas").bind(TOUCHEND, function(e) {
    current_shape = null;
    resize_stage = false;
});

function delete_current() {
    if (!selected_shape)
        return;
    if (selected_shape.type === 'root') {
        var frame = movie.currentFrame();
        var i = frame.figures.length;
        while (i--) {
            if (frame.figures[i] === selected_shape) {
                console.log('found to del', i);
                frame.delFigure(i);
            }
        }
    }
    selected_shape.delete();
    selected_shape = null;
}

$('body').keyup(function(e) {
    if (e.which === 46) {
        delete_current();
    }
});

function addFigure(name, src/*, out*/) {
    var div = document.createElement("div");
    var parent = document.createElement("div");
    parent.className = "figcont";
    parent.innerHTML = "" + name + "";
    $(parent).data("iconsrc", src);
    $(parent).data("libindex", library.length); //fix for del

    $(parent).bind(TOUCHSTART, function() {
        if (!$(this).data('startdown'))
            $(this).data("startdown", new Date - 0);
    });
    $(parent).bind(TOUCHEND, {name: name}, function(e) {
        if ((new Date) - $(this).data('startdown') > 1337) {
            if (confirm("Are you sure you want to delete figure \"" + e.data.name + "\" from the figures library? This action can not be reverted.")) {
                $(parent).remove();
                var existing = localStorage.figures ? JSON.parse(localStorage.figures) : [], changed = [];
                for (var i = 0; i < existing.length; i++) {
                    if (existing[i].name + '' !== e.data.name + '') {
                        changed.push(existing[i]);
                    }
                }
                localStorage.figures = JSON.stringify(changed);

            }
        }
        $(this).data('startdown', null);
    });
    $(parent).click(function() {

        if (!playback) {
            // take figure from the library and randomize its placement
            var figure = library[$(this).data("libindex")].save();
            // the root            
            if (!$(this).data("libindex")) {
                figure = new Figure();
                console.log(figure);
                console.log(figure.save());
            }
            figure.pos = [
                (Math.floor(movie.stage.x + Math.random() * movie.stage.width)),
                (Math.floor(movie.stage.y + Math.random() * movie.stage.height))];
            // also give it a unique identifier to carry onwards
            figure.id = nextid();
            movie.currentFrame().addFigure(figure);

            // TODO - handle IDs
        }

    });
    parent.appendChild(div);
    document.getElementById("figures").appendChild(parent);
    var canvas = Raphael(div, 30, 30);
    canvas.id = 'fig';

    fig = new Figure();
    fig.load(src);
    fig.addpaper(canvas);
    fig.renderSample();
    library.push(fig);
}

$(window).resize(function() {
    $("#leftsidebar").height(innerHeight - 240);
    draw.setSize($("#canvas").width(), $("#canvas").height());
    $("#canvas").height(innerHeight - 240);
    $("#leftsidebar").width(120);
    $("#sidebar").width(200);
    $("#stage").width(innerWidth - 200 - 120 - 100); //??
});

function togglePlayback() {
    if (playback) {
        playback = false;
        $('#play i').addClass('icon-play').removeClass('icon-pause').text(' Play');
        $(".figcont").show();
        $("#next").show();
        $('#playbackstage').hide();
        $('#canvas').show();
        movie.selectFrame(movie.currentframe, draw);
        movie.stop();
        movie.cleanStage(drawstage);
    } else {
        playback = true;
        $('#canvas').hide();
        $('#play i').addClass('icon-pause').removeClass('icon-play').text(' Pause');
        $('#playbackstage').show();
        $('#playbackstage').css({top: movie.stage.y, left: movie.stage.x, height: movie.stage.height, width: movie.stage.width});
        drawstage = Raphael('playbackstage');
        drawstage.id = 'playback';
        drawstage.setViewBox(movie.stage.x, movie.stage.y, movie.stage.width, movie.stage.height);
        $(".figcont").hide();
        current_shape = null;
        selected_shape = null;
        $("#next").hide();
        movie.cleanStage(draw);
        movie.play(drawstage);

    }
}

// the onLoad...
$(function() {
//    document.documentElement.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
    draw = Raphael("canvas");
    movie.setStage(draw);

    // the main stage
    draw.id = 'stage';
    draw.onion = true;
    draw.editable = true;
    $("#canvas").height(innerHeight - 240);
    var ffoffset = $("#canvas").offset();
    ffoffset.left = Math.floor(ffoffset.left);
    $("#canvas").bind(TOUCHMOVE, function(e) {
        $(this).css('cursor', '');
        if (e.offsetX === undefined) // this works for Firefox
        {
            xpos = e.pageX - ffoffset.left;
            ypos = e.pageY - ffoffset.top;
        }
        else                     // works in Google Chrome
        {
            xpos = e.offsetX;
            ypos = e.offsetY;
        }
        // need to test
        if (e.originalEvent && e.originalEvent.touches) {
            xpos = e.originalEvent.touches[0].offsetX;
            ypos = e.originalEvent.touches[0].offsetY;
        }
        if (current_shape) {
            if (e.shiftKey || !length_locked) {
                $(this).css('cursor', 'move');
                current_shape.move(xpos, ypos);
            } else {
                $(this).css('cursor', 'crosshair');
                current_shape.rotate(xpos, ypos);
            }
            current_shape.renderAll();
            render_info();
        }
        if (resize_stage) {
            $(this).css('cursor', 'nw-resize');
            if (resize_stage === stagehandle1) {
                movie.stage.width += movie.stage.x - xpos;
                movie.stage.height += movie.stage.y - ypos;
                movie.stage.x = xpos;
                movie.stage.y = ypos;
                stage_rect.attr(movie.stage);
                stagehandle1.attr({
                    x: movie.stage.x - handle_size,
                    y: movie.stage.y - handle_size
                });
            } else if (resize_stage === stagehandle2) {
                movie.stage.width = xpos - movie.stage.x;
                movie.stage.height = ypos - movie.stage.y;
                stage_rect.attr(movie.stage);
                stagehandle2.attr({
                    x: movie.stage.x + movie.stage.width - handle_size,
                    y: movie.stage.y + movie.stage.height - handle_size
                });
            }
            movie.updateThumbs();
        }
    });

    $("#lockswitch").click(function() {
        if (length_locked = !length_locked) {
            $("#locked").show();
            $("#unlocked").hide();
        } else {
            $("#locked").hide();
            $("#unlocked").show();
        }
    });

    colorpicker = Raphael.colorwheel($('#colorpicker'), 300);

    $("#play").click(function() {
        togglePlayback();
    });

    $("#new").click(function() {
        movie.del();
        movie.addFrame();
    });

    $("#save").click(function() {
        if (window.username) {
            var name = prompt("Enter a name for the figure you want to add to the library.", "");
            $.ajax({
                type: "POST",
                url: "//doodleblaze.com/users.php",
                data: {
                    "action": "save",
                    "moviename": name,
                    "movie": JSON.stringify(movie.save())
                },
                dataType: 'json'
            });
        }
        // if not logged, save locally
        localStorage.movie = JSON.stringify(movie.save());
    });

    $("#load").click(function() {
        if (window.username) {
            var name = prompt("Enter a name for the figure you want to add to the library.", "");
            $.ajax({
                url: "//doodleblaze.com/users.php",
                data: {
                    "action": "load",
                    "moviename": name
                },
                dataType: 'json'
            }).done(function(data) {
                movie.del();
                movie.load(data);
            });
        } else {
            movie.del();
            movie.load(JSON.parse(localStorage.movie));
        }
    });

    $("#next").bind(TOUCHSTART, function() {
        movie.addFrame();
        movie.copyFrame(movie.currentframe - 1);
        $('#timescroll')[0].scrollLeft = 100000000; //big number scrolls to end.
        return;
    });

    $("#timeline td").live("click", function() {
        if (playback) {
            exit_playback();
        }
        if ($(this).attr('id') === 'next')
            return;
        movie.selectFrame($(this).index(), draw);

    });

    addFigure("Blank", {"type": "root", "pos": [200, 200], "angle": 0, "children": [{"type": "circle", "length": 20, "width": 20, "color": "#FFA500", "angle": 0, "children": []}]}); //blank is a special case
    addFigure("Stickman", {"type": "root", "width": 6, "color": "#000", "children":
                [{"type": "line", "length": 50, "angle": 110, "children": [{}]},
                    {"type": "line", "length": 50, "angle": 70, "children": [{}]},
                    {"type": "line", "length": 30, "angle": -90, "children":
                                [{"children":
                                                [{"type": "circle", "length": 35, "fill": "#000"},
                                                    {"length": 40, "angle": 140, "children":
                                                                [{"angle": 10}]},
                                                    {"length": 40, "angle": -140, "children":
                                                                [{"angle": -10}]}]}]}]});

    if (localStorage && localStorage.figures) {
        var lsf = JSON.parse(localStorage.figures);
        for (var i = 0; i < lsf.length; i++) {
            var fig = lsf[i];
            addFigure(fig.name, fig.json);
        }
    }

    if (localStorage && localStorage.frames) {
        var framecount = localStorage.frames.length;
        for (var i = 0; i < framecount; i++) {
            var fig = lsf[i];
            addFigure(fig.name, fig.json);
        }
    }

    movie.addFrame();

    $("#angle").parent().click(function() {
        var ang = prompt("Enter new angle", Math.floor(selected_shape._angle * (180 / Math.PI)));
        if (ang !== null && ang !== undefined) {
            selected_shape._angle = ang / (180 / Math.PI);
            selected_shape.renderAll();
        }
    });
    $("#length").parent().click(function() {
        var len = prompt("Enter new length", Math.floor(selected_shape.length));
        if (len !== null && len !== undefined) {
            selected_shape.length = len;
            selected_shape.renderAll();
        }
    });
    $(".color").click(function() {
        colorpicker.color(selected_shape.color);
        $("#colorpicker").show();
        colorpicker.onchange(function(color) {
            selected_shape.color = color;
            selected_shape.renderAll();
        });
    });

    $(".colorfill").click(function() {
        colorpicker.color(selected_shape.fill);
        $("#colorpicker").show();
        colorpicker.onchange(function(color) {
            selected_shape.fill = color;
            selected_shape.renderAll();
        });
    });

    $("#width").parent().click(function() {
        var len = prompt("Enter new stroke-width", selected_shape.width);
        if (len !== null && len !== undefined) {
            selected_shape.width = len;
            selected_shape.renderAll();
        }
    });

    $(".line").click(function() {
        new Line(selected_shape, Math.floor(420 * Math.random()) % 360);
        selected_shape.renderAll();
    });

    $(".circle").click(function() {
        new Circle(selected_shape, Math.floor(420 * Math.random()) % 360);
        selected_shape.renderAll();
    });

    $(".image").click(function() {
        var src = prompt("Enter new image source", selected_shape.src);
        new Image(selected_shape, src);//, src, Math.floor(420 * Math.random()) % 360);
        selected_shape.renderAll();
    });
    $(".text").click(function() {
        var text = prompt("Enter new text", selected_shape.text);
        new Text(selected_shape, text);//, src, Math.floor(420 * Math.random()) % 360);
        selected_shape.renderAll();
    });

    $(".delete").click(function() {
        delete_current();
    });
    $(".scalefig").click(function() {
        var scale = prompt("Enter a scale:", "50");
        selected_shape.scale(scale);
    });
    $(".makefig").click(function() {
        var json = selected_shape.save();
        delete json.pos;

        if (json.children.length === 0/* && !magic*/) {
            return alert('You probably want to add more shapes to it first');
        }
        var name = prompt("Enter a name for the figure you want to add to the library.", "Fig" + Math.floor(Math.random() * 993588125));
        if (name) {
            var existing = localStorage.figures ? JSON.parse(localStorage.figures) : [];
            localStorage.figures = JSON.stringify(existing.concat([{name: name, json: json}]));
            addFigure(name, json);
        }
    });
    $("#home").click(function() {
        window.location.href = '//doodleblaze.com/';
    });

    stage_rect = draw.rect(movie.stage.x, movie.stage.y, movie.stage.width, movie.stage.height).attr("fill", "#ffffff").attr("stroke", "none");

    stagehandle1 = draw.rect(movie.stage.x - handle_size, movie.stage.y - handle_size, handle_size * 2, handle_size * 2).attr("fill", "#E8D22C");
    $(stagehandle1.node).bind(TOUCHSTART, function() {
        resize_stage = stagehandle1;
    });

    stagehandle2 = draw.rect(movie.stage.x + movie.stage.width - handle_size, movie.stage.y + movie.stage.height - handle_size, handle_size * 2, handle_size * 2).attr("fill", "#E8D22C");

    $(stagehandle2.node).bind(TOUCHSTART, function() {
        resize_stage = stagehandle2;
    });

    //hmm ;)
    $(window).resize();
    $('.render').hide();
    //login hack
    $.ajax({
        url: "//doodleblaze.com/users.php",
        data: {"action": "user"},
        dataType: 'json'
    }).done(function(data) {
        console.log(data);
        if (data !== null) {
            window.username = data;
            a = location.search.split('=')
            if (a.length) {
                $.ajax({
                    url: "//doodleblaze.com/users.php",
                    data: {
                        "action": "load",
                        "moviename": a[1]
                    },
                    dataType: 'json'
                }).done(function(data) {
                    movie.del();
                    movie.load(data);
                });
            }
        }
    });
});