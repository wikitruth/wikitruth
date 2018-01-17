if(typeof window.WT_CONSTANTS == 'undefined') {
    window.WT_CONSTANTS = {};
}

window.WT_CONSTANTS.summernote = {
    standardHeight: 250,
    standardToolbar: [
        ['style', ['style']],
        ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
        /*['fontname', ['fontname']],*/
        ['color', ['color']],
        ['list', ['ul', 'ol']],
        ['para', ['paragraph']],
        ['table', ['table']],
        ['insert', ['link', 'picture', 'video']],
        ['view', ['fullscreen']],
        ['view2', ['codeview']],
        ['help', ['help']]
    ],
    compactHeight: 100,
    compactToolbar: [
        ['font', ['bold', 'underline', 'strikethrough', 'clear']],
        ['list', ['ul', 'ol']],
        ['para', ['paragraph']],
        ['insert', ['link']],
        ['view', ['codeview']]
    ]
};

function disableEditorTooltipsOnTouchDevice() {
    if($('.note-editor').length > 0 && ('ontouchstart' in document.documentElement)) {
        $('.note-editor .note-btn').tooltip('disable');
    }
}

function setupTextEditor(editorSelector, formSelector, options) {
    var editorOptions = {
        height: WT_CONSTANTS.summernote.standardHeight,
        toolbar: WT_CONSTANTS.summernote.standardToolbar
    };
    if(!options) options = {};

    if(options.compact) {
        editorOptions.height = WT_CONSTANTS.summernote.compactHeight;
        editorOptions.toolbar = WT_CONSTANTS.summernote.compactToolbar;
    }

    if(options.disableEditorTooltipsOnTouchDevice) {
        editorOptions.callbacks = {
            onInit: function () {
                disableEditorTooltipsOnTouchDevice();
            }
        }
    }

    $(editorSelector).summernote(editorOptions);

    $(formSelector).on("submit", function(){
        if ($(editorSelector).summernote('codeview.isActivated')) {
            $(editorSelector).summernote('codeview.deactivate');
        }
    });
}

/* Off Canvas */
$(document).ready(function () {
    var sidebar = $('.sidebar-offcanvas');
    if(sidebar.length > 0) {
        $('[data-toggle="offcanvas"]').click(function () {
            $('.row-offcanvas').toggleClass('active');
            if (sidebar.hasClass('visible-sm')) {
                setTimeout(function () {
                    sidebar.toggleClass('visible-xs visible-sm');
                }, 250);
            } else {
                sidebar.toggleClass('visible-xs visible-sm');
                $('.row-offcanvas').css('min-height', (parseInt(sidebar.css('height')) + parseInt(sidebar.css('margin-bottom')) + parseInt(sidebar.css('margin-top'))) + 'px');
            }
        });
    }

    var showMore = $('.wt-show-more');
    if(showMore.length > 0) {
        showMore.click(function () {
            var contentContainer = $(this).parents('.wt-entry-row-content');
            var content = contentContainer.data('content');
            if(content) {
                // FIXME: this is an XSS vulnerability, fix it.
                contentContainer.html($("<div/>").html(content).text());
            }
            return false;
        });
    }

    $('.wt-entry-reply').popover({
        placement: 'auto',
        title: 'Reply with...',
        html: true,
        content: $('#entryReplyContent').html(),
        container: 'body',
        template: $('#popoverTemplate').html()
    });

    $('.wt-entry-reply').on('show.bs.popover', function () {
        //console.log('wt-entry-reply showing...');
    });
});