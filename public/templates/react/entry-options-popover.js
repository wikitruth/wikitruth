function EntryOptionsPopover(props) {

    /*var editElement;
    switch (props.type) {
        case WT_CONSTANTS.OBJECT_TYPES.topic:
            editElement = <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Topic</a></li>;
            break;
        case WT_CONSTANTS.OBJECT_TYPES.argument:
            editElement = <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Fact</a></li>;
            break;
        default:
            editElement = <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Entry</a></li>;
    }*/

    return (
        <ul class="nav">
            {/*<li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Comment</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Issue</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Answer</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Question</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Artifact</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Fact Link</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Fact</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Topic Link</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Topic</a></li>
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit Entry</a></li>
            {editElement}*/}
            <li><a href="#"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit {WT_CONSTANTS.OBJECT_FORMAL_NAME_MAP[props.type]}</a></li>
            <li><a href="#" onclick="return entryTakeOwnership2()"><i class="fa fa-hand-grab-o" aria-hidden="true"></i> Take Ownership</a></li>
            <li><a href="#" onclick="return entryDelete2()"><i class="fa fa-trash-o" aria-hidden="true"></i> Delete</a></li>
            <li role="separator" class="divider"></li>
            <li><a href="#"><i class="fa fa-rss" aria-hidden="true"></i> Follow</a></li>
            <li><a href="#"><i class="fa fa-share" aria-hidden="true"></i> Share</a></li>
            <li><a href="#"><i class="fa fa-flag" aria-hidden="true"></i> Report</a></li>
            <li><a href="#"><i class="fa fa-info-circle" aria-hidden="true"></i> Details</a></li>
            <li role="separator" class="divider"></li>
            <li class="dropdown-header">Screener</li>
            <li><a href="" title="Set screening status" class="no-underline">
                <i class="fa fa-pencil-square-o" aria-hidden="true"></i> Screening Status</a></li>
        </ul>
    );
}

function entryTakeOwnership2() {
    return false;
    if (confirm('Are you sure you want to Take Ownership of this entry?')) {
        var csrf = $('body').data('csrf');
        var id = $('body').data('entry-id');
        var type = $('body').data('entry-type');

        $.ajax({
            type: "POST",
            url: "/ajax/entry/take-ownership",
            data: JSON.stringify({id: id, type: type, _csrf: csrf}),
            contentType: 'application/json',
            success: function (data) {
                location.reload();
            }
        });
    }

    return false;
}

function entryDelete2() {
    return false;
    if (confirm('Are you sure you want to Delete this entry?')) {
        var csrf = $('body').data('csrf');
        var id = $('body').data('entry-id');
        var type = $('body').data('entry-type');

        $.ajax({
            type: "POST",
            url: "/ajax/entry/delete",
            data: JSON.stringify({id: id, type: type, _csrf: csrf}),
            contentType: 'application/json',
            success: function (data) {
                if (data.redirectUrl) {
                    location.href = data.redirectUrl;
                }
            }
        });
    }
    return false;
}

function generateOptionsContentMenu() {
    //console.log('creating context menu...');
    var listGroupItem = $(this).parents('.list-group-item');
    var objectId = $(listGroupItem).data('id');
    var objectType = $(listGroupItem).data('type');

    //console.log('id=' + objectId + ',type=' + objectType);
    ReactDOM.render(
        <EntryOptionsPopover id={objectId} type={objectType} />,
        document.getElementById('entryOptionsContent')
    );
    return $('#entryOptionsContent').html();
}

$('.wt-entry-options').popover({
    placement: 'auto',
    title: 'More options',
    html: true,
    content: generateOptionsContentMenu,
    container: 'body',
    template: $('#popoverTemplate').html()
});

$('.wt-entry-options').on('show.bs.popover', function () {
    //console.log('wt-entry-options showing...');
});

const element = <EntryOptionsPopover />;
ReactDOM.render(
    element,
    document.getElementById('entryOptionsContent')
);