/****
 * @Author Christopher Stephens Thomas UWI
 * @version 1.0
 * This plugin adds scrolling capabilities
 * to a div with overflow
 ****/
;(function($){
	String.prototype.endsWith = function(suffix) {
    			return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
	//public methods
	var methods={
		//Reposition element to left 0
		reset:function(){
			var main=$(this);
			main.find('ul').css({left:0});
			return main;
		},
		forceResize:function(){
			var main=$(this);
			var width=main.width();
			settings=main.data('scroller');
			totalwidth=0;
					if(settings.space=='auto'){
						space=core.getSpacing(main);
					}
					main.find('ul').find('li').each(function(){
						totalwidth+=$(this).outerWidth(true)+space;
					});
					totalwidth+=space;
			if(totalwidth>width){
				width=totalwidth;
			}
			main.find('ul').css({width:width});
			return main;
		},
		repositionButton:function(){
			var main=$(this),
			settings=main.data('scroller'),
			space=settings.space,
			parent=main.parent(),
			index=parent.find(main).index(main.context),
			ul=main.find('ul'),
			mp=main.position(),
			top=mp.top;
			if(main.selector!=''&&main.selector){
				index=parent.find(main).index(main.selector);
			}
				if(settings.space=='auto'){
					space=core.getSpacing($(this));
				}
			parent.find('.scroller-button:eq('+index+')').css({top:top});
			parent.find('.scroller-button.scroll-right:eq('+index+')').css({top:top});
			return main;
		},
		//Return Last visible element
		getLast:function(){
			core.getLast($(this));
			return $(this).data('lastvisible');
		},
		//Return first visible element
		getFirst:function(){
			core.getFirst($(this));
			return $(this).data('firstvisible');
		},
		//Is elemeent scrolled over view
		isOver:function(){
			return core.overflow($(this));
		},
		//Is elemeent scrolled unders view
		isUnder:function(){
			return core.underflow($(this));
		},
		//Reposition list to show current element completely in view
		refit:function(){
			
				var main= $(this),
				settings = $(this).data('scroller'),
				space=settings.space;
				if(settings.space=='auto'){
					space=core.getSpacing(main);
				}
				core.realign(main.data('scroller').selection,main,space);
				return main;
		},
		//Resize scroller based on parents size
		resize:function(){
			
			return $(this).each(function(){
					var main=$(this),
					settings = main.data('scroller'),
					space=settings.space,
					oldwidth=main.data('oldwidth'),
 					newwidth=main.width(),
 					totalwidth=0;
					if(settings.space=='auto'){
						space=core.getSpacing(main);
					}
					main.find('ul').find('li').each(function(){
						totalwidth+=$(this).outerWidth(true)+space;
					});
				//Update size only is new size is larger
					if(oldwidth>newwidth){
						newwidth=oldwidth;
 					}
 					
 					if(totalwidth>newwidth){
						newwidth=totalwidth;
					}
					newwidth-=core.toPixels($(this).find('ul').css('paddingLeft'))+core.toPixels($(this).find('ul').css('paddingRight'));
					newwidth+=space;
					main.find('ul').css({width:newwidth});
 					if(main.data('newwidth')){
 						var old=main.data('newwidth');
 						main.data('oldwidth',old);
 					}
 					main.data('newwidth',newwidth);
 					methods.repositionButton.call(this);		
 					methods.refit.call(this);
 			});
 				
 			
		},
		//Resize ul according to number of elements in view
		update:function(){

			
				var totalwidth=0,
				main=$(this),
				settings = main.data('scroller'),
				ul=main.find('ul'),
				space=settings.space,
				currentsize=ul.width();
				if(settings.space=='auto'){
					space=core.getSpacing(main);
				}
				ul.find('li').each(function(){
					totalwidth+=$(this).outerWidth(true)+space;
				});
				totalwidth+=space;
				if(totalwidth>currentsize){
					ul.css({width:totalwidth});
				}
				
				methods.repositionButton.call(this);
				return main;
		},
		//Initialize scroll element
		init:function(options){
			
			var settings = $.extend({},$.fn.scroller.defaults,options);
			
			return $(this).each(function(){
				
				var main=$(this);
				main.addClass('scroll-view');
				//Change size to ration
				if(!$.isNumeric(settings.proportion)||settings.proportion>1){
					settings.proportion=core.toPercent(settings.proportion,main);
				}
				
				//store settings;
				main.data('scroller',settings);
		
				//Element already initialized
				if(main.data('scroll-initialized')){
					return false;
				}
				//Collect styling and sizing options
				var height=main.height();
			
				var top=main.position().top;
				var ul=main.find('ul');
				var totalwidth=0;
				var space=settings.space;
				//Presets
				main.data('oldwidth',main.width());
				main.data('scroll-initialized',true);
				
				if(settings.space=='auto'){
					space=core.getSpacing(main);
				}
				//Height of button is the height of ul + ul padding
				var topM=0;
				var conH=ul.find('li:first').outerHeight(true)+core.toPixels(main.find('ul').css('paddingTop')),
				currentsize=ul.width(),
				parent=main.parent(),
				width=((1-settings.proportion)/2)*100,
				bwidth=settings.bspace,
				mainwidth=(settings.proportion)*100-(bwidth*2);
				if(settings.background.position=='absoluteTop'&&parent.parent()){
					topM=core.toPixels(parent.parent().css('paddingTop'));
				}
				
				//Reset ul Position
				ul.css({'position':'relative','left':space,height:ul.height()});
				//Resize ul
				methods.resize.call(this);
				//Append buttons and set width and position which is width of left button + space between left button and scroll-view
				main.css({width:mainwidth+'%',left:(width+bwidth)+'%'})
				.after('<button  class=\'scroller-button scroll-right\' style=\'position:absolute;width:'+width+'%;height:'+conH+'px;left:'+(width+(bwidth*2)+mainwidth)+'%;top:'+top+'px;z-index:999;margin:0px;padding:0px\'></button>')
				.before('<button  class=\'scroller-button scroll-left\' style=\'position:absolute;width:'+width+'%;height:'+conH+'px;left:0px;top:'+top+'px;z-index:999;margin:0px;padding:0px\'></button>');
				var right=parent.find('.scroll-right'),
				left=parent.find('.scroll-left');
				//User want to use jquery ui buttons
				if(settings.html=='ui'){
					left.button({icons: {primary: "ui-icon-carat-1-w"},text: false});
					right.button({icons: {primary: "ui-icon-carat-1-e"},text: false});
					var adjustment=core.toPixels(parent.css('paddingTop'));
					if(settings.background.css==''){
						main.parent().append('<div class=\'scroller-background\' style=\'background-image:'+ul.css('background-image')+';background-color:'+ul.css('background-color')+';height:'+(main.outerHeight()+adjustment+top)+'px;top:'+(ul.position().top-topM)+'px\'></div>');
					}
					else{
						$('<div class=\'scroller-background\' style=\'background-image:'+ul.css('background-image')+';background-color:'+ul.css('background-color')+';height:'+(main.outerHeight()+adjustment+top)+'px;top:'+(ul.position().top-topM)+'px\'></div>').appendTo(parent).css(settings.background.css);
					}
					ul.css({'background':'none','border-top':'none','border-left':'none','border-right':'none'});
					left.css({'margin-right':0,'margin-left':0});
					right.css({'margin-right':0,'margin-right':0});
					
				}
				//User want to create custom style
				else{
					//Add html to buttons
					if(settings.html!=''){
						left.html(settings.html.buttonLeft);
						right.html(settings.html.buttonRight);
					}
					
				}
					
				//Scroll to the left
				left.click(function(){
					core.getFirst(main);
					var currentleft=ul.position().left,
					first=main.data('firstvisible'),
					previous=first.prev(),
					left=currentleft,
					padding=core.getPadding(main);
						if(core.underflow(main)){
							//move first element completely in view
							left=currentleft+(main.offset().left-first.offset().left+space);
							left+=padding.left;
						}
						//move previous element in view partially
						if(core.underflow(main)){
							left+=previous.width()/2;
						}
						ul.css({left:left});
				});
				
				//Scroll to the right	
				right.click(function(){
					core.getLast(main);
					var currentleft=ul.position().left,
					left=currentleft,
					last=main.data('lastvisible'),
					next=last.next(),
					padding=core.getPadding(main);
					
						//if overflow
						if(core.overflow(main)){
							//move last element completely in  view
							left=currentleft-(((last.offset().left-main.offset().left)+last.outerWidth()+space)-main.width());
							left-=padding.right;
						}
						//Move next element partially in view
						if(core.overflow(main)){
							left-=next.width()/2;
						}
						ul.css({left:left});
				});
			});
		}
	};
	var core={
		//Convert rgb to hex
		//@param string
		rgb2hex:function (rgb) {
    		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    		function hex(x) {
        		return ("0" + parseInt(x).toString(16)).slice(-2);
    		}
    		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
		},
	//Convert padding of an element to integer
	//@param DOM Object
		getPadding:function(main){
			var ul=main.find('ul'),
			obj=new Object(),
			leftpadding=ul.css('paddingLeft'),
			rightpadding=ul.css('paddingRight'),left,right;
			left=core.toPixels(leftpadding,main);
			right=core.toPixels(rightpadding,main);
			obj['left']=left;
			obj['right']=right;
			return obj;
	},
	toPixels:function(adjust,main){
			adjust=String(adjust);
			
			if(adjust.endsWith('%')){
				size=parseInt(adjust.slice(0,-1))*main.parent().width()/100;
			}
			else if(adjust.endsWith('px')){
				size=parseInt(adjust.slice(0,-2));
			}
			else if(adjust.endsWith('em')){
				size=parseInt(adjust.slice(0,-1))*10;
			}
			else{
				size=adjust*1;
			}
			return size;
	},
	toPercent:function(adjust,main){
		return (core.toPixels(adjust,main)/main.parent().width());
	},
	//Determines the spacing between each li element
	//@param DOM Object
		getSpacing:function(main){
			var li=main.find('ul').find('li:first'),
			space=li.innerWidth() - li.width()+li.outerWidth() - li.innerWidth();
			return space;
		},
	//Realigns the list to place current element in view
	//@param current element selector,current scrollable element and spacing between li's
		realign:function(selection,main,space){
			var ul=main.find('ul'),
			current=ul.find(selection);
			if(!main.data('started')){
				ul.css({left:0});
			}
			
			if(core.overflow(main)){
				main.data('started',true);
				if(current.length<1){
					core.getLast(main);
					main.data('lastvisible');
					current=ul.find(main.data('lastvisible'));
				}
				var c=current.offset().left,
				d=current.width(),
				a=main.offset().left,
				b=main.width(),
				next=current.next(),
				padding=core.getPadding(main);
				
				if((c+d)>(a+b)){
					//if current moves out of view from main ever so slightly
					left=c-(a+b)+d+space;
					left+=padding.right;
					//move current element in view completely
					ul.css({left:-left});
					//move next element partially in view
					if(core.overflow(main)){
						left+=(next.width()/2)+space;
					}
					ul.css({left:-left});
					main.data('started',false);
				}
				else{
					main.data('started',false);
				}
			}
			else{
				main.data('started',false);
				
			}
	},
	
	overflow:function(main){
			//if there exist an element beyond scroll view true ie position out of view to right
		var state=false,
		ul=main.find('ul');
		if((ul.width()+ul.position().left)>main.width()){
			state=true;
		}
		
		return state;
	},
	
	underflow:function(main){
		//if there exist an element under scroll view true ie position out of view to left
		var state=false,
		ul=main.find('ul');
		if((ul.offset().left)<main.offset().left){
			state=true;
		}
		
		return state;
	},
	//Finds last li in scrollable list that is still in view
	getLast:function(main){
		
		main.find('li').each(function(){
						if($(this).offset().left>(main.width()+main.offset().left)){
							return false;
						}
						else{
							main.data('lastvisible',$(this));
						}
					});
	},
	//Finds first li in scrollable list that is still in view
	getFirst:function (main){
		//panning to left
		
		//currentleft+$('.scroller').offset().left-$('#ui-id-3').offset().left)+2+(previous.outer+2)
		
		main.find('li').each(function(){
						if(($(this).offset().left+$(this).width())>main.offset().left){
							main.data('firstvisible',$(this));
							return false;
						}
						
					});
		
	}
	};
	$.fn.scroller = function()
	{
		method=arguments[0];
 		
		// Check if the passed method exists
		if(methods[method]) {
 
			// If the method exists, store it for use
			// Note: I am only doing this for repetition when using "each()", later.
			method = methods[method];
            arguments = Array.prototype.slice.call(arguments, 1);		
		// If the method is not found, check if the method is an object (JSON Object) or one was not sent.
		}
		else{
 
			// If we passed parameters as the first object or no arguments, just use the "init" methods
			method = methods.init;
			
		}
		return method.apply(this, arguments);
	};

	// public
	$.fn.scroller.defaults =
	{
		proportion:0.93,
		bspace:0,
		space:'auto',
		selection:'li[aria-selected=true]',
		html:'ui',
		background:{
			position:'',
			css:''
		}
	
	};

})(jQuery);

//@ sourceURL=root/js/jquery.scroller.js
