function EntryOptionsPopover(props) {

    var idparam = (props.type == WT_CONSTANTS.OBJECT_TYPES.topic || props.type == WT_CONSTANTS.OBJECT_TYPES.argument || props.type == WT_CONSTANTS.OBJECT_TYPES.opinion ? 'id' : WT_CONSTANTS.OBJECT_ID_NAME_MAP[props.type]);
    var editUrl = '/' + WT_CONSTANTS.OBJECT_NAMES_MAP[props.type] + '/create?' + idparam + '=' + props.id;
    var screeningUrl = WT_PATHS.wiki.screening + '?' + WT_CONSTANTS.OBJECT_ID_NAME_MAP[props.type] + '=' + props.id;
    var renderDivider = props.isOwner || WT_USER.isAdmin;

    if(props.private) {
        editUrl = WT_PATHS.members.index + '/' + WT_USER.username + WT_PATHS.members.profile.diary + editUrl;
    }

    return (
        <ul class="nav">
            {props.isOwner ? (
                <li><a href={editUrl}><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit {WT_CONSTANTS.OBJECT_FORMAL_NAME_MAP[props.type]}</a></li>
            ):(null)}
            {WT_USER.username && WT_USER.isAdmin && !props.isOwner ? (
                <li><a href="#" onclick="return entryTakeOwnership2()"><i class="fa fa-hand-grab-o" aria-hidden="true"></i> Take Ownership</a></li>
            ):(null)}
            {props.isOwner ? (
                <li><a href="#" onclick="return entryDelete2()"><i class="fa fa-trash-o" aria-hidden="true"></i> Delete</a></li>
            ):(null)}
            {renderDivider ? (
                <li role="separator" class="divider"></li>
            ):(null)}
            <li><a href="#"><i class="fa fa-rss" aria-hidden="true"></i> Follow</a></li>
            <li><a href="#"><i class="fa fa-share" aria-hidden="true"></i> Share</a></li>
            <li><a href="#"><i class="fa fa-flag" aria-hidden="true"></i> Report</a></li>
            <li><a href="#"><i class="fa fa-info-circle" aria-hidden="true"></i> Details</a></li>
            <li role="separator" class="divider"></li>
            {/*<li class="dropdown-header">Screener</li>*/}
            <li><a href={screeningUrl} title="View or set screening status" class="no-underline">
                <i class="fa fa-check-square-o" aria-hidden="true"></i> Screening Status</a></li>
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
    var isOwner = $(listGroupItem).data('is-owner');
    var isPrivate = $(listGroupItem).data('private');

    //console.log('id=' + objectId + ',type=' + objectType);
    ReactDOM.render(
        <EntryOptionsPopover id={objectId} type={objectType} isOwner={isOwner} private={isPrivate} />,
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