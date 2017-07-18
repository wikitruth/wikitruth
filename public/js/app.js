var WT_CONSTANTS = {
    summernote: {
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
    },
    OBJECT_TYPES: {
        topic: 1,
        argument: 2,
        question: 3,
        comment: 4,
        definition: 5,
        issue: 10,
        opinion: 11
    }
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

    $('.wt-entry-reply').popover({
        placement: 'auto',
        title: 'Reply with...',
        html: true,
        content: $('#entryReplyContent').html(),
        container: 'body',
        template: $('#popoverTemplate').html()
    });
    $('.wt-entry-options').popover({
        placement: 'auto',
        title: 'More options',
        html: true,
        content: $('#entryOptionsContent').html(),
        container: 'body',
        template: $('#popoverTemplate').html()
    });
});