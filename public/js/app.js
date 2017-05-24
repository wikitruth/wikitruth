var WT_CONSTANTS = {
    summernote: {
        contentHeight: 250,
        contentToolbar: [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
            /*['fontname', ['fontname']],*/
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video']],
            ['view', ['fullscreen', 'codeview', 'help']]
        ],
        referenceHeight: 100,
        referenceToolbar: [
            ['font', ['bold', 'underline', 'strikethrough', 'clear']],
            ['para', ['ul', 'ol', 'paragraph']],
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
});