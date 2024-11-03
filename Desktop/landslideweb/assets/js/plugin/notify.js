(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(["jquery"], factory);
    } else {
        factory(typeof exports === "object" ? require("jquery") : jQuery);
    }
}(function ($) {
    function hasDuplicate(notification) {
        var isDuplicate = false;

        $('[data-notify="container"]').each(function (index, element) {
            var $element = $(element),
                title = $element.find('[data-notify="title"]').text().trim(),
                message = $element.find('[data-notify="message"]').html().trim(),
                isTitleMatch = title === $("<div>" + notification.settings.content.title + "</div>").html().trim(),
                isMessageMatch = message === $("<div>" + notification.settings.content.message + "</div>").html().trim(),
                hasSameType = $element.hasClass("alert-" + notification.settings.type);

            if (isTitleMatch && isMessageMatch && hasSameType) {
                isDuplicate = true;
            }
            return !isDuplicate;
        });

        return isDuplicate;
    }

    function Notification(notification, options, defaults) {
        var content = {
            message: typeof options === "object" ? options.message : options,
            title: options.title ? options.title : "",
            icon: options.icon ? options.icon : "",
            url: options.url ? options.url : "#",
            target: options.target ? options.target : "-"
        };

        options = $.extend(true, {}, { content: content }, options);
        this.settings = $.extend(true, {}, defaults, options);
        this._defaults = defaults;

        if ("-" === this.settings.content.target) {
            this.settings.content.target = this.settings.url_target;
        }

        this.animations = {
            start: "webkitAnimationStart oanimationstart MSAnimationStart animationstart",
            end: "webkitAnimationEnd oanimationend MSAnimationEnd animationend"
        };

        if (typeof this.settings.offset === "number") {
            this.settings.offset = { x: this.settings.offset, y: this.settings.offset };
        }

        if (this.settings.allow_duplicates || !this.settings.allow_duplicates && !hasDuplicate(this)) {
            this.init();
        }
    }

    var defaults = {
        element: "body",
        position: null,
        type: "info",
        allow_dismiss: true,
        allow_duplicates: true,
        newest_on_top: false,
        showProgressbar: false,
        placement: {
            from: "top",
            align: "right"
        },
        offset: 20,
        spacing: 10,
        z_index: 1031,
        delay: 5000,
        timer: 1000,
        url_target: "_blank",
        mouse_over: null,
        animate: {
            enter: "animated fadeInDown",
            exit: "animated fadeOutUp"
        },
        onShow: null,
        onShown: null,
        onClose: null,
        onClosed: null,
        icon_type: "class",
        template: '<div data-notify="container" class="col-10 col-xs-11 col-sm-4 alert alert-{0}" role="alert">' +
                  '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">&times;</button>' +
                  '<span data-notify="icon"></span> ' +
                  '<span data-notify="title">{1}</span> ' +
                  '<span data-notify="message">{2}</span>' +
                  '<div class="progress" data-notify="progressbar">' +
                  '<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
                  '</div><a href="{3}" target="{4}" data-notify="url"></a></div>'
    };

    String.format = function () {
        var str = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            str = str.replace(RegExp("\\{" + (i - 1) + "\\}", "gm"), arguments[i]);
        }
        return str;
    };

    $.extend(Notification.prototype, {
        init: function () {
            this.buildNotify();
            if (this.settings.content.icon) {
                this.setIcon();
            }
            if (this.settings.content.url !== "#") {
                this.styleURL();
            }
            this.styleDismiss();
            this.placement();
            this.bind();

            this.notify = {
                $ele: this.$ele,
                update: function (key, value) {
                    var updates = {};
                    if (typeof key === "string") {
                        updates[key] = value;
                    } else {
                        updates = key;
                    }

                    for (var prop in updates) {
                        switch (prop) {
                            case "type":
                                this.$ele.removeClass("alert-" + this.settings.type);
                                this.$ele.find('[data-notify="progressbar"] > .progress-bar').removeClass("progress-bar-" + this.settings.type);
                                this.settings.type = updates[prop];
                                this.$ele.addClass("alert-" + updates[prop]).find('[data-notify="progressbar"] > .progress-bar').addClass("progress-bar-" + updates[prop]);
                                break;
                            case "icon":
                                var $icon = this.$ele.find('[data-notify="icon"]');
                                if (this.settings.icon_type.toLowerCase() === "class") {
                                    $icon.removeClass(this.settings.content.icon).addClass(updates[prop]);
                                } else if ($icon.is("img") || $icon.find("img")) {
                                    $icon.attr("src", updates[prop]);
                                }
                                break;
                            case "progress":
                                var delay = this.settings.delay - this.settings.delay * (updates[prop] / 100);
                                this.$ele.data("notify-delay", delay);
                                this.$ele.find('[data-notify="progressbar"] > div').attr("aria-valuenow", updates[prop]).css("width", updates[prop] + "%");
                                break;
                            case "url":
                                this.$ele.find('[data-notify="url"]').attr("href", updates[prop]);
                                break;
                            case "target":
                                this.$ele.find('[data-notify="url"]').attr("target", updates[prop]);
                                break;
                            default:
                                this.$ele.find('[data-notify="' + prop + '"]').html(updates[prop]);
                        }
                        var outerHeight = this.$ele.outerHeight() + parseInt(this.settings.spacing) + parseInt(this.settings.offset.y);
                        this.reposition(outerHeight);
                    }
                },
                close: function () {
                    notification.close();
                }
            };
        },

        buildNotify: function () {
            var content = this.settings.content;
            this.$ele = $(String.format(this.settings.template, this.settings.type, content.title, content.message, content.url, content.target));
            this.$ele.attr("data-notify-position", this.settings.placement.from + "-" + this.settings.placement.align);
            if (!this.settings.allow_dismiss) {
                this.$ele.find('[data-notify="dismiss"]').css("display", "none");
            }
            if (this.settings.delay <= 0 && !this.settings.showProgressbar) {
                this.$ele.find('[data-notify="progressbar"]').remove();
            }
        },

        setIcon: function () {
            var $icon = this.$ele.find('[data-notify="icon"]');
            if (this.settings.icon_type.toLowerCase() === "class") {
                $icon.addClass(this.settings.content.icon);
            } else if ($icon.is("img")) {
                $icon.attr("src", this.settings.content.icon);
            } else {
                $icon.append('<img src="' + this.settings.content.icon + '" alt="Notify Icon" />');
            }
        },

        styleDismiss: function () {
            this.$ele.find('[data-notify="dismiss"]').css({
                position: "absolute",
                right: "10px",
                top: "5px",
                zIndex: this.settings.z_index + 2
            });
        },

        styleURL: function () {
            this.$ele.find('[data-notify="url"]').css({
                backgroundImage: "url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)",
                height: "100%",
                left: 0,
                position: "absolute",
                top: 0,
                width: "100%",
                zIndex: this.settings.z_index + 1
            });
        },

        placement: function () {
            var self = this,
                offsetY = this.settings.offset.y,
                cssProperties = {
                    display: "inline-block",
                    margin: "0px auto",
                    paddingLeft: "65px",
                    position: this.settings.position ? this.settings.position : (this.settings.element === "body" ? "fixed" : "absolute"),
                    transition: "all .5s ease-in-out",
                    zIndex: this.settings.z_index
                },
                isFirstPlacement = false,
                $elements = this.settings;

            $('[data-notify-position="' + this.settings.placement.from + "-" + this.settings.placement.align + '"]:not([data-closing="true"])').each(function () {
                offsetY = Math.max(offsetY, parseInt($(this).css($elements.placement.from)) + parseInt($(this).outerHeight()) + parseInt($elements.spacing));
            });

            if ($elements.newest_on_top) {
                cssProperties[$elements.placement.from] = offsetY + "px";
                offsetY += this.$ele.outerHeight() + parseInt($elements.spacing);
            } else {
                cssProperties[$elements.placement.from] = offsetY + "px";
                offsetY += this.$ele.outerHeight() + parseInt($elements.spacing);
            }

            this.$ele.css(cssProperties).animate({ opacity: 1 }, 600).appendTo(this.settings.element);

            if (this.settings.showProgressbar) {
                this.$ele.find('[data-notify="progressbar"] > div').css("width", "100%");
                this.$ele.data("notify-delay", this.settings.delay);
                this.startProgressBar();
            }

            this.$ele.addClass(this.settings.animate.enter);
            setTimeout(function () {
                self.$ele.addClass("animated").removeClass(self.settings.animate.enter);
                if (typeof self.settings.onShow === "function") {
                    self.settings.onShow.call(this);
                }
            }, 600);
        },

        startProgressBar: function () {
            var self = this;
            this.interval = setInterval(function () {
                var $progressBar = self.$ele.find('[data-notify="progressbar"] > div'),
                    currentWidth = $progressBar.attr("aria-valuenow"),
                    newWidth = currentWidth - (100 / (self.settings.delay / self.settings.timer));

                if (newWidth <= 0) {
                    self.close();
                } else {
                    $progressBar.attr("aria-valuenow", newWidth).css("width", newWidth + "%");
                }
            }, self.settings.timer);
        },

        bind: function () {
            var self = this;

            this.$ele.find('[data-notify="dismiss"]').on("click", function () {
                self.close();
            });

            this.$ele.hover(
                function () {
                    clearInterval(self.interval);
                    if (self.settings.showProgressbar) {
                        $(this).find('[data-notify="progressbar"] > div').stop().css("width", $(this).find('[data-notify="progressbar"] > div').attr("aria-valuenow") + "%");
                    }
                },
                function () {
                    if (self.settings.showProgressbar) {
                        self.startProgressBar();
                    }
                }
            );

            if (typeof this.settings.mouse_over === "function") {
                this.$ele.mouseover(this.settings.mouse_over);
            }
        },

        close: function () {
            var self = this;

            this.$ele.addClass(this.settings.animate.exit);
            setTimeout(function () {
                self.$ele.remove();
                if (typeof self.settings.onClose === "function") {
                    self.settings.onClose.call(this);
                }
            }, 600);
        },

        reposition: function (outerHeight) {
            var self = this,
                notifyPosition = this.$ele.attr("data-notify-position").split("-"),
                align = notifyPosition[1],
                direction = notifyPosition[0],
                $elements = $('[data-notify-position="' + direction + "-" + align + '"]:not([data-closing="true"])');

            if (this.settings.newest_on_top) {
                $elements.each(function (index) {
                    if (index === 0) {
                        $(this).css(direction, outerHeight + "px");
                    } else {
                        $(this).css(direction, (parseInt($(this).css(direction)) + outerHeight + parseInt(self.settings.spacing)) + "px");
                    }
                });
            } else {
                $elements.each(function (index) {
                    if (index === 0) {
                        $(this).css(direction, outerHeight + "px");
                    } else {
                        $(this).css(direction, (parseInt($(this).css(direction)) - outerHeight - parseInt(self.settings.spacing)) + "px");
                    }
                });
            }
        }
    });

    $.notify = function (options) {
        return new Notification(this, options, defaults);
    };

    $.notifyDefaults = function (options) {
        defaults = $.extend(true, {}, defaults, options);
    };

    $.notifyClose = function (selector) {
        if (typeof selector === "undefined") {
            $('[data-notify="container"]').each(function () {
                $(this).data("notify-delay", 0).fadeOut();
            });
        } else {
            $(selector).data("notify-delay", 0).fadeOut();
        }
    };
}));
