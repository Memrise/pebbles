actionable = {};

actionable.utils = function() {
  var wait = function(time, f) {
    setTimeout(f, time);
  };

  var assert = function(bool, message) {
    if(!bool) {
        if(message) {
            throw message;
        } else {
            throw 'Assertion failed';
        }
    }
  };

  return {
    wait : wait,
    assert : assert,
    flush : function(f) { wait(1, f); }
  };
}();


/* 
Docs at http://www.jperla.com/blog/write-bug-free-javascript-with-actionable

Accepts spinner url (to an animated gif of a spinner for waits).
Set up a live listener on divs with classes of type "actionable".

Classes of type actionable contain a hidden div which has class "kwargs".

.actionable .kwargs { display: none; }

kwargs div contains a number of <input> html elements, each with a name and value.  The name is the key name, the value is the value for that key.  In this way, in HTML, we specify a dictionary of keyword arguments to the actionable.

Here are some self-explanatory examples:

<!-- When this button is clicked, 
    replaces content with return value of the url below.
    If you want it to be clickable multiple times,
        just return another actionable in the response!
-->
<div id="#money">
    <button class="actionable">
        Show me the money!
        <div class="kwargs">
            <!-- replace money with /user/3/money/create -->
            <input name="type" value="replace" />
            <input name="target" value="#money" />
            <input name="url" value="/user/3/money/create" />
        </div>
    </button>
</div>

<!--  Submit a form via AJAX to the backend.
        It's never been so easy to toggle a setting!
-->
<button class="actionable" id="#sethappy">
    Set happy
    <div class="kwargs">
        <form method="GET" action="/user/set/happiness/1">
            <input name="user" value="18489123" />
            <input name="happiness" value="100" />
            <input name="clicked" value="YES" />
        </form>

        <!-- submit form and replace target with response-->
        <input name="type" value="submit-form" />
        <input name="target" value="#sethappy" />
    </div>
</button>



<!--  This will show a comment in another div
        that is dynamically loaded from the url when clicked.
-->
<div>
    <div class="actionable">
        show full comment
        <div class="kwargs">
            <!-- replace long-comment with /comment/get/3 -->
            <input name="type" value="replace" />
            <input name="target" value="#long-comment" />
            <input name="url" value="/comment/get/3" />
        </div>
    </div>
    <div id="#long-comment"></div>
</div>


<!-- This is the same as above, 
        but will allow hiding the comment again 
        by clicking the same button.
-->
<div>
    <div class="actionable">
        <div class="when-closed">show full comment</div>
        <div class="when-open">hide</div>
        <div class="kwargs">
            <input name="type" value="open-close" />
            <input name="target" value="#long-comment" />
            <input name="url" value="/comment/get/3" />
        </div>
    </div>
    <div id="#long-comment"></div>
</div>




It fails loudly if misconfigured.  It is easy to do everything right and it is easy for you to write a complex ajax website with no extra javascript code.


Full arguments are below:
===========================
Arguments:
  type: replace, open-close, submit-form
        replace replaces the target with the url
        open-close will toggle hide/display the target, which also may dynamically lazily load content from an url
        submit-form submits a form via ajax which is a child of the actionable, or may be specified in form argument; the response of the ajax replaces target

  url: url string of remote page contents

  target: CSS3 selector of element on page to update

  target-type: absolute, parent, sibling, closest, or child-of
                Absolute just executes the target selector.
                Parent executes target selector on jQuery.parents().
                Sibling the same on siblings.
                Closest looks at children and children of children and so on.
                child-of looks at target's children

  closest: used in combination with target-type:child-of to get target's children
  form: used in combination with type:submit-form to find the form

If you use the open-close type, then the actionable can have two child divs with classes "when-open" and "when-closed".  Fill when-open with what the actionable looks like when the target is toggled open (for example, a minus sign), and fill when-closed with what the it looks like when the target is toggled closed (for example, a plus sign).

*/


actionable.ajax = function(spinner) {
  var generate_replace_and_show = function(target) {
    var replace_and_show = function(response) {
      target.html(response);
      target.show();
    };
    return replace_and_show;
  };

  var kwargs_of_action = function(button) {
    inputs = button.children('.kwargs').children('input');
    var kwargs = {};
    for(var i=0;i<inputs.length;i++) {
      var name = inputs.eq(i).attr('name');
      var val = inputs.eq(i).val();
      kwargs[name] = val;
    }
    return kwargs;
  };

  var target_from_kwargs = function(button, kwargs) {
    var target = null;
    if(!kwargs['target-type']) {
        kwargs['target-type'] = 'absolute';
    }
    if(kwargs['target-type'] == 'absolute') {
        target = jQuery(kwargs['target']);
    } else if(kwargs['target-type'] == 'parents') {
        target = button.parents(kwargs['target']);
    } else if(kwargs['target-type'] == 'child-of') {
        var closest = button.closest(kwargs['closest']);
        target = closest.find(kwargs['target']);
    } else if(kwargs['target-type'] == 'closest') {
        target = button.closest(kwargs['target']);
    } else if(kwargs['target-type'] == 'siblings') {
        target = button.siblings(kwargs['target']);
    } else {
        throw 'No known target type: ' + kwargs['target-type'];
    }

    if(target.length == 0) {
        throw 'No target found for selector: ' + kwargs['target-type'] + kwargs['target'];
    } else if(target.length > 1) {
        throw 'Too many targets found for selector: ' + kwargs['target-type'] + kwargs['target'];
    } else {
        return target;
    }
  };

  var act_on_opener_closer = function(button, kwargs) {
    var target = target_from_kwargs(button, kwargs);
    if(target.css('display') != 'none') {
        button.children('.when-closed').show();
        button.children('.when-open').hide();
        target.hide();
    } else {
        var url = kwargs['url'];
        button.children('.when-closed').hide();
        button.children('.when-open').show();
        if(target.html() != "" || !url) {
            target.show();
        } else {
            target.html('<img src="' + spinner + '" />');
            target.show();
            actionable.utils.flush(function() {
                jQuery.ajax({url: url,
                    success: generate_replace_and_show(target) });
            });
        }
    }
    return false;
  };

  var act_on_form_submitter = function(button, kwargs) {
    var target = target_from_kwargs(button, kwargs);
    if(kwargs['form']) {
        var form = jQuery(kwargs['form']);
    } else {
        var form = button.closest('form');
    }
    actionable.utils.assert(form.length == 1, 'No form found in button');
    var method = form.attr('method');
    var url = form.attr('action');
    actionable.utils.assert(url !== '', 'Form submit URL is not blank');
    var data = form.formSerialize();
    actionable.utils.assert(data !== '', 'Form should send some data');
    button.html('<img src="' + spinner + '" />');
    jQuery.ajax({url: url,
                 method: method,
                 data: data,
                 success: generate_replace_and_show(target) });
    return false;
  };

  var action = function(e) {
    var button = jQuery(this);
    var kwargs = kwargs_of_action(button);
    /* #TODO: jperla: better error handling */
    if(kwargs['type'] == 'open-close') {
        return act_on_opener_closer(button, kwargs);
    } else if(kwargs['type'] == 'submit-form') {
        return act_on_form_submitter(button, kwargs);
    } else if(kwargs['type'] == 'replace')
        return always_replace_target_with_url(e);
    } else {
        throw 'No known kwargs type';
    }
  };

  var always_replace_target_with_url = function(e) {
    var button = jQuery(this);
    var target_selector = button.children("input[name='target']").eq(0).val();
    var target = jQuery(target_selector);
    actionable.utils.assert(target.length > 0, 'Did not find a target with selector: ' + target_selector);
    var url = button.children("input[name='url']").eq(0).val();
    target.hide();
    actionable.utils.flush(function() {
        jQuery.ajax({url: url,
            success: generate_replace_and_show(target) });
    });
    return false;
  };

  return {
    always_replace_target_with_url: always_replace_target_with_url,
    action: action
  };
}();


jQuery(function() {
  jQuery('.actionable').live('click', actionable.ajax.action);
});

 
