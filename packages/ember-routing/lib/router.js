require('ember-routing/route_matcher');
require('ember-routing/routable');
require('ember-application/system/location');

var get = Ember.get, getPath = Ember.getPath, set = Ember.set;

/**
  @class
  
  `Ember.Router` is the subclass of `Ember.StateManager` responsible for providing URL-based
  application state detection. The `Ember.Router` instance of an application detects the browser URL
  at application load time and attempts to match it to a specific application state. Additionally
  the router will update the URL to reflect an application's state changes over time.

  ## Adding a Router Instance to Your Application
  An instance of Ember.Router can be associated with an instance of Ember.Application in one of two ways:

  You can provide a subclass of Ember.Router as the `Router` property of your application. An instance
  of this Router class will be instantiated and route detection will be enabled when the application's
  `initialize` method is called. The Router instance will be available as the `stateManager` property
  of the application:

      App = Ember.Application.create({
        Router: Ember.Router.extend({ ... })
      });

      App.initialize();
      App.get('stateManager') // an instance of App.Router

  If you want to define a Router instance elsewhere, you can pass the instance to the application's
  `initialize` method:

      App = Ember.Application.create();
      aRouter = Ember.Router.create({ ... });

      App.initialize(aRouter);
      App.get('stateManager') // aRouter

  ## Adding Routes to a Router
  The `initialState` property of Ember.Router instances is `root`. The Ember.Route stored in this
  property should have sub-states with `route` properties that describes the URL pattern you would
  like to detect.

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            index: Ember.Route.extend({
              route: '/'
            }),
            ... additional Ember.Routes ... 
          })
        })
      });
      App.initialize();


  When an application loads, Ember will parse the URL and attempt to find an Ember.Route within
  the application's states that matches. (The example URL-matching below will use the default 
  'hash syntax' provided by `Ember.HashLocation`.)

  In the following route structure:

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/'
            }),
            bRoute: Ember.Route.extend({
              route: '/alphabeta'
            })
          })
        })
      });
      App.initialize();

  Loading the page at the URL '#/' will detect the route property of 'root.aRoute' ('/') and
  transition the router first to the state named 'root' and then to the substate 'aRoute'.

  Respectively, loading the page at the URL '#/alphabeta' would detect the route property of
  'root.bRoute' ('/alphabeta') and transition the router first to the state named 'root' and
  then to the substate 'bRoute'.

  As with all Ember.State instances Ember.Routes can be nested within other Ember.Routes to
  create expressive state sets. However, only Ember.States that are leaf states can have detectable
  `route` properties. Parent states (or leaf states without a `route`
  property) can be used to capture application state that cannot be re-entered later.

  ## Route Transition Events
  Transitioning between Ember.Route instances (including the transition into the detected
  route when loading the application)  triggers the same transition events as state transitions for
  base Ember.States. However, the default `setup` transition event is named `connectOutlets` on
  Ember.Router instances (see 'Changing View Hierarchy in Response To State Change').

  The following route structure when loaded with the URL "#/"

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/'
              enter: function(router){
                console.log("entering root.aRoute from", manager.getPath('currentState.name'));
              },
              connectOutlets: function(router){
                console.log("entered root.aRoute, fully transitioned to", manager.getPath('currentState.path'));
              }
            })
          })
        })
      });
      App.initialize();

  Will result in console output of:

      'entering root.aRoute from root'
      'entered root.aRoute, fully transitioned to root.aRoute '

  ## Routes With Dynamic Segments
  An Ember.Route's `route` property can reference dynamic sections of the URL by prefacing a URL segment
  with the ':' character.  The values of these dynamic segments will be passed as a hash to the
  `connectOutlets` method of the matching Route. The following route structure when loaded with the URL
  "#/fixed/thefirstvalue/anotherFixed/thesecondvalue":

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/fixed/:dynamicSectionA/anotherFixed/:dynamicSectionB'
              connectOutlets: function(router, context){}
            })
          })
        })
      });
      App.initialize();

  Will call the 'connectOutlets' method of the Route instance at the path 'root.aRoute' with the
  following hash as its second argument:

      {
        dynamicSectionA: 'thefirstvalue',
        dynamicSectionB: 'thesecondvalue'
      }

  ## Transitions Between States
  Once a routed application has initialized its state based on the entry URL subsequent transitions to other
  states will update the URL if the entered State has a `route` property. Given the following state structure
  loaded at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              connectOutlets: function(router, context){},
              moveElsewhere: Ember.State.transitionTo('bRoute')
            }),
            bRoute: Ember.Route.extend({
              route: '/someOtherLocation'
            })
          })
        })
      });
      App.initialize();

  And application code:

      App.get('stateManager').send('moveElsewhere');

  Will transition the application's state to 'root.bRoute' and trigger an update of the URL to
  '#/someOtherLocation

  For URL patterns with dynamic segments a context can be supplied as the second argument to `send`.
  The router will match dynamic segments names to keys on this object and fill in the URL with the
  supplied values. Given the following state structure loaded at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              connectOutlets: function(router, context){},
              moveElsewhere: Ember.State.transitionTo('bRoute')
            }),
            bRoute: Ember.Route.extend({
              route: '/a/route/:dynamicSection/:anotherDynamicSection'
            })
          })
        })
      });
      App.initialize();

  And application code:

      App.get('stateManager').send('moveElsewhere', {
        dynamicSection: '42',
        anotherDynamicSection: 'Life'
      });

  Will transition the application's state to 'root.bRoute' and trigger an update of the URL to
  '#/a/route/42/Life'.

  The context argument will also be passed as the second argument to the `connectOutlets` method call.

  ## Detecting Routing/Non-Routing Calls to `connectOutlets`
  Because `connectOutlets` will be called both for the initial route detection and on subsequent application
  state changes that affect the browser URL the router can differentiate between these two conditions with
  its `isRouting` property. If you need to take special action for either condition (e.g. loading remote data),
  check this property:

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              connectOutlets: function(router, context){
                if (router.get('isRouting')) {
                  // load data from server
                };
              },
            })
          })
        })
      });
      App.initialize();

  ## Injection of Controller Singletons
  During application initialization Ember will detect properties of the application ending in 'Controller',
  create a singleton instance of this class, and assign it as a property of the router.  The property name
  will be the UpperCamel name converted to lowerCamel format. These controller classes should be subclasses
  of Ember.ObjectController, Ember.ArrayController, or a custom Ember.Object that includes the
  Ember.ControllerMixin mixin.

      App = Ember.Application.create({
        FooController: Ember.Object.create(Ember.ControllerMixin),
        Router: Ember.Router.extend({ ... })
      });

      App.getPath('stateManager.fooController'); // instance of App.FooController

  The controller singletons will have their `namespace` property set to the application and their `target` 
  property set to the application's router singleton for easy integration with Ember's user event system.
  See 'Changing View Hierarchy in Response To State Change'

  ## Responding to User-initiated Events
  Controller instances injected into the router at application initialization have their `target` property
  set to the application's router instance. These controllers will also be the default `context` for their
  associated views.  Uses of the `{{action}}` helper will automatically target the application's router.

  Given the following application entered at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              anActionOnTheRouter: function(router, context){
                router.transitionTo('anotherState', context);
              }
            })
            anotherState: Ember.Route.extend({
              route: '/differentUrl',
              connectOutlets: function(router, context){

              }
            })
          })
        })
      });
      App.initialize();

  The following template:

      <script type="text/x-handlebars" data-template-name="aView">
          <h1><a {{action anActionOnTheRouter}}>{{title}}</a></h1>
      </script>

  Will delegate `click` events on the rendered `h1` to the application's router instance. In this case the
  `anActionOnTheRouter` method of the state at 'root.aRoute' will be called with the view's controller
  as the context argument. This context will be passed to the `connectOutlets` as its second argument.

  A different `context` can be supplied from within the `{{action}}` helper, allowing specific context passing
  between application states:

      <script type="text/x-handlebars" data-template-name="photos">
        {{#each photo in controller}}
          <h1><a {{action showPhoto context="photo"}}>{{title}}</a></h1>
        {{/each}}
      </script>

  See Handlebars.helpers.actions for additional usage examples.


  ## Changing View Hierarchy in Response To State Change
  Changes in application state that change the URL should be accompanied by associated changes in view
  hierarchy.  This can be accomplished by calling 'connectOutlet' on the injected controller singletons from
  within the 'connectOutlets' event of an Ember.Route:

      App = Ember.Application.create({
        OneController: Ember.ObjectController.extend(),
        OneView: Ember.View.extend(),

        AnotherController: Ember.ObjectController.extend(),
        AnotherView: Ember.View.extend(),

        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              connectOutlets: function(router, context){
                router.get('oneController').connectOutlet('another');
              },
            })
          })
        })
      });
      App.initialize();


  This will detect the '{{outlet}}' portion of `oneController`'s view (an instance of `App.OneView`) and
  fill it with a rendered instance of `App.AnotherView` whose `context` will be the single instance of
  `App.AnotherController` stored on the router in the `anotherController` property.

  For more information about Outlets see Ember.Handlebars.helpers.outlet. For more information about controller
  injections see Ember.Application#initialize(). For additional information about view context see Ember.View.
  
  @extends Ember.StateManager
*/
Ember.Router = Ember.StateManager.extend(
/** @scope Ember.Router.prototype */ {

  /**
    @property {String}
    @default 'root'
  */
  initialState: 'root',

  /**
    The `Ember.Location` implementation to be used to manage the application
    URL state. The following values are supported:

    * 'hash': Uses URL fragment identifiers (like #/blog/1) for routing.
    * 'none': Does not read or set the browser URL, but still allows for
      routing to happen. Useful for testing.

    @type String
    @default 'hash'
  */
  location: 'hash',

  /**
    On router, transitionEvent should be called connectOutlets

    @property {String}
    @default 'connectOutlets'
  */
  transitionEvent: 'connectOutlets',

  route: function(path) {
    set(this, 'isRouting', true);

    try {
      path = path.replace(/^(?=[^\/])/, "/");

      this.send('unroutePath', path);

      var currentURL = get(this, 'currentState').absoluteRoute(this);
      var rest = path.substr(currentURL.length);

      this.send('routePath', rest);
    } finally {
      set(this, 'isRouting', false);
    }

    get(this, 'currentState').updateRoute(this, get(this, 'location'));
  },

  urlFor: function(path, hash) {
    var currentState = get(this, 'currentState') || this,
        state = this.findStateByPath(currentState, path);

    Ember.assert("To get a URL for a state, it must have a `route` property.", !!get(state, 'routeMatcher'));

    var location = get(this, 'location'),
        absoluteRoute = state.absoluteRoute(this, hash);

    return location.formatURL(absoluteRoute);
  },

  urlForEvent: function(eventName, context) {
    var currentState = get(this, 'currentState');
    var targetStateName = currentState.lookupEventTransition(eventName);

    Ember.assert(Ember.String.fmt("You must specify a target state for event '%@' in order to link to it in the current state '%@'.", [eventName, get(currentState, 'path')]), !!targetStateName);

    var targetState = this.findStateByPath(currentState, targetStateName);

    Ember.assert("Your target state name " + targetStateName + " for event " + eventName + " did not resolve to a state", !!targetState);
    var hash = targetState.serialize(this, context);

    return this.urlFor(targetStateName, hash);
  },

  /** @private */
  init: function() {
    this._super();

    var location = get(this, 'location');
    if ('string' === typeof location) {
      set(this, 'location', Ember.Location.create({ implementation: location }));
    }
  },

  /** @private */
  willDestroy: function() {
    get(this, 'location').destroy();
  }
});
