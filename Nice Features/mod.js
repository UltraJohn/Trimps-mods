// ==UserScript==
// @name         Trimps Visual Overhaul
// @version      1.0
// @description  Overhauls the visuals of Trimps
// @author       UltraJohn
// @include      *trimps.github.io*
// @include      *kongregate.com/games/GreenSatellite/trimps
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @connect      *trimps.github.io*
// @connect      self
// ==/UserScript==

Element.prototype.appendBefore = function (element) {
  element.parentNode.insertBefore(this, element);
},false;
Element.prototype.appendAfter = function (element) {
  element.parentNode.insertBefore(this, element.nextSibling);
},false;




(function() {
    var $ = jQuery;

    $('head').append($("<style type=\"text/css\">\n" +
                //".glyphicon-apple{color:darkred;}\n" +
                //".glyphicon-tree-deciduous{color:limegreen;}\n"+
                //".icomoon.icon-cubes{color:silver;}\n"+
                //".icomoon.icon-diamond{color:white;}\n"+
                //"#settingsTable .btn{padding:0}\n" +

                //".corrupted-class{font-size:1vh;position:absolute;top:3px;left:3px;}" +
                //".cellColorBeaten .corrupted-class{visibility:hidden;}" +
                //".cellColorBeaten .fightinfo-class{visibility:hidden;}" +
                ".fightinfo-class{font-size:1vh;position:absolute;top:3px;right:3px;}" +
                ".fightinfo-color1{text-shadow:0px 0px 15px #fb753f;}" +
                ".fightinfo-color2{text-shadow:0px 0px 15px #8c0000;}" +
                ".fightinfo-color3{text-shadow:0px 0px 15px #ffffff;}" +

                // message box font
                ".message{font-size:.7vw !important}" +

                "#talentsEssenceTotal{font-size:inherit;}" +
                "#modReplaceSelect{color:white !important;}" +
                "#advMapsControlBtns{font-size:1.5vw;}" +
                "#mapsCreateRow{padding-top: 2.1vw;}" +

                ".tooltipdiv{width: 50%;position: absolute;background: lightgrey;display: none;padding: 10px;border: 2px solid blue;font-size: 0.9vw;z-index: 7;}" +

                //"#Trap, #Barn, #Shed, #Forge, #Hut, #House, #Mansion, #Hotel, #Resort, #Gateway, #Wormhole, #Collector, #Warpstation, #Gym, #Tribute, #Nursery{width:16.1%;}" +
                //"#Farmer, #Lumberjack, #Miner, #Scientist{width:18%;}" +

                // Spire assault
                "#autoItemsDiv,#autoItemsDiv.modeLg{max-height:35em;}" +

                '</style>'));

    var $grid = $('<table style="width:100%;margin-top:5px;margin-left:2px;font-size:0.9vw;box-shadow:none !important;"><tr>' +
                '<td id="magnimp-cell"><span class="glyphicon glyphicon-magnet"></span><label style="margin-left:4px" title="Magnimp - 0.3% extra loot from maps and Zones (Not Helium)">...</label></td>' +
                '<td id="venimp-cell"><span class="glyphicon glyphicon-baby-formula"></span><label style="margin-left:4px" title="Venimp - Grants 0.3% Trimp breed speed">...</label></td>' +
                '</tr><tr>' +
                '<td id="whipimp-cell"><span class="icomoon icon-area-graph"></span><label style="margin-left:4px" title="Whipimp - Grants 0.3% Trimp resource production speed">...</label></td>' +
                //'<td id="titimp-cell"><span class="icomoon icon-hammer"></span><label style="margin-left:4px" title="Titimp - +100% damage for 30 seconds in maps">' + prettify(game.global.titimpLeft) + '</label></td>' +
                '<td id="titimp-cell"><span class="icomoon icon-hammer"></span><label style="margin-left:4px" title="Blacksmithery III (90% of highest zone)">...</label></td>' +
                '</tr><tr>' +
                '<td colspan="2" id="scryer-cell"><span class="icomoon icon-cloud3"></span><label style="margin-left:4px" title="Dark Essence - Remaining x Amount (Total)">...</label></td>' +
                '</tr><tr><td colspan="2" id="voidmaps-cell"><span class="glyphicon glyphicon-globe"></span><label style="margin-left:4px;" title="Void maps (Stacked)">...</label></td></tr></table>');
            $('#battleBtnsColumn').append($grid);

    var imp_updater = setInterval(function(){
    var whipStrength = Math.pow(1.003, game.unlocks.impCount.Whipimp);
        whipStrength = prettify((whipStrength - 1) * 100) + "%";
        var magimpStrength = Math.pow(1.003, game.unlocks.impCount.Magnimp);
        magimpStrength = prettify((magimpStrength - 1) * 100) + "%";
        var venimpStrength = Math.pow(1.003, game.unlocks.impCount.Venimp);
        venimpStrength = prettify((venimpStrength - 1) * 100) + "%";

        var mag = $('#magnimp-cell').find('label');
        if (mag.text() !== magimpStrength) mag.text(magimpStrength);
        var whip = $('#whipimp-cell').find('label');
        if (whip.text() !== whipStrength) whip.text(whipStrength);
        var ven = $('#venimp-cell').find('label');
        if (ven.text() !== venimpStrength) ven.text(venimpStrength);
    }, 1000);

    var tit_updater = setInterval(function(){
    //$('#titimp-cell').find('label').text(prettify(game.global.titimpLeft > 0 ? game.global.titimpLeft : 0));
    $('#titimp-cell').find('label').text("Z"+Math.floor((getHighestLevelCleared(false, true) + 1) * 0.9));
    }, 5000);

    var voidmaps_updater = setInterval(function(){
    $('#voidmaps-cell').find('label').text(game.global.totalVoidMaps + (Fluffy.isRewardActive('void') ? " ("+countStackedVoidMaps()+")" : "") + " Void Maps");
    }, 3000);

    var radon_bonus_updater = setInterval(function(){
        if(game.global.universe == 2){

            var radon_num = game.global.lastRadonPortal;

            var radon_percent = prettify((Fluffy.getRadortleMult() - 1) * 100);
            $('#scryer-cell').find('label').text("Z"+radon_num+ " ("+radon_percent+"%)");
        }else{
            if(true == false && game.global.world >= 181){
                var drops = countRemainingEssenceDrops();
                var amount = calculateScryingReward();
                $('#scryer-cell').find('label').text(drops + " x " + prettify(amount) + " ("+ prettify(drops*amount) +")");
            }else{
                $('#scryer-cell').find('label').text("0");
            }
            
        }

    }, 1000);
    /*
    var scryer_updater = setInterval(function(){
        if(game.global.world < 181){
            $('#scryer-cell').find('label').text('0');
        }else{
            var drops = countRemainingEssenceDrops();
            var amount = calculateScryingReward()
            $('#scryer-cell').find('label').text(drops + ' x ' + prettify(amount) + " ("+prettify(drops*amount)+")");
        }
        
    }, 1000);
    */

    var a = {};
    (function() {

    a.fightinfo = {},
    a.fightinfo.$worldGrid = document.getElementById("grid"),
    a.fightinfo.$mapGrid = document.getElementById("mapGrid"),
    a.fightinfo.powerful = ["Improbability", "Omnipotrimp", "Mutimp", "Hulking_Mutimp"],
    a.fightinfo.exotics = ["Feyimp", "Tauntimp", "Venimp", "Whipimp", "Magnimp", "Goblimp", "Flutimp", "Jestimp", "Titimp", "Chronoimp"],
    a.fightinfo.colors = {
        bone: "#ffffff",
        exotic: "#000000",
        powerful: "#000000"
    },
    a.fightinfo.lastProcessedWorld = null,
    a.fightinfo.lastProcessedMap = null,
    a.fightinfo.Update = function() {
        if (game.global.mapsActive && true === false) // Disabled map
            var c = game.global.mapGridArray
              , d = Array.prototype.slice.call(a.fightinfo.$mapGrid.children);
        else {
            if (null === a.fightinfo.lastProcessedWorld || a.fightinfo.lastProcessedWorld !== game.global.world)
                a.fightinfo.lastProcessedWorld = game.global.world;
            else
                return;
            var c = game.global.gridArray
              , d = Array.prototype.slice.call(a.fightinfo.$worldGrid.children)
        }
        d = d.reverse();
        var e = [];
        d.forEach(function(j) {
            e = e.concat(Array.prototype.slice.call(j.children))
        });
        for (var f = 0; f < e.length; f++) {
            var g = e[f]
              , h = c[f];
            g.style.position = "relative";
            -1 < h.name.toLowerCase().indexOf("skele") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"glyphicon glyphicon-italic fightinfo-class fightinfo-color3\"></span>",
            g.style.textShadow = "null") : -1 < a.fightinfo.powerful.indexOf(h.name) ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<!--<span class=\"glyphicon glyphicon-alert fightinfo-class fightinfo-color2\"></span>-->",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("cthulimp") ? g.style.textShadow = "null" : -1 < h.name.toLowerCase().indexOf("goblimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML = "<span class=\"icomoon icon-evil fightinfo-class fightinfo-color1\"></span> ",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("flutimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML = "<span class=\"glyphicon glyphicon-globe fightinfo-class fightinfo-color1\"></span> ",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("jestimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML = "<span class=\"icomoon icon-mask fightinfo-class fightinfo-color1\"></span> ",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("titimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML = "<span class=\"icomoon icon-hammer fightinfo-class fightinfo-color1\"></span> ",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("chronoimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML = "<span class=\"glyphicon glyphicon-hourglass fightinfo-class fightinfo-color1\"></span> ",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("feyimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"icomoon icon-diamond fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("tauntimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"glyphicon glyphicon-tent fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("venimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"glyphicon glyphicon-baby-formula fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("whipimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"icomoon icon-area-graph fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("turkimp") ? (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"icomoon icon-birthday-cake fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null") : -1 < h.name.toLowerCase().indexOf("magnimp") && (0 !== h.special.length && (g.innerHTML += " "),
            g.innerHTML += "<span class=\"glyphicon glyphicon-magnet fightinfo-class fightinfo-color1\"></span>",
            g.style.textShadow = "null"),
            null != h.corrupted && "none" !== h.corrupted ? g.title += `${h.name} \- ${mutationEffects[h.corrupted].title}` : game.global.mapsActive ? g.title = `${h.name}` : g.title += ` ${h.name}`

            /*if(h.corrupted){
                g.innerHTML += "<span class='"+mutationEffects[h.corrupted].icon+" corrupted-class'></span>";
            }*/

            }
            }
            }
            )();
    var fight_info = setInterval(a.fightinfo.Update, 2000);


    var nature_div = $("<div id='nature_div' style='height:50px;position:absolute;bottom:10px;display:none;'><label id='nature_text'></label></div>");
    $("#gridRow").append(nature_div);
    var last_processed_nature_zone = 0;
    var nature_updater = setInterval(function(){
       if(last_processed_nature_zone == game.global.world) return;
       last_processed_nature_zone = game.global.world;
       if(game.global.world < 236 && game.global.challengeActive != "Eradicated"){
           $("#nature_div").hide();
           return;
       }
       $("#nature_div").show();
       var nature_text = "<span style='font-size:1.1em' class='badge badbadge badName"+getEmpowerment()+"'>"+game.global.world + " ("+getEmpowerment()+")</span> > " +
           "<span style='font-size:1.1em' class='badge badbadge badName"+getEmpowerment(5)+"'>"+(((5 - ((game.global.world - 1) % 5)) + (game.global.world - 1)) + 1) + " ("+getEmpowerment(5)+")</span> > " +
           "<span style='font-size:1.1em' class='badge badbadge badName"+getEmpowerment(10)+"'>"+(((5 - ((game.global.world+5 - 1) % 5)) + (game.global.world+5 - 1)) + 1) + " ("+getEmpowerment(10)+")</span> > " +
           "<span style='font-size:1.1em' class='badge badbadge badName"+getEmpowerment(15)+"'>"+(((5 - ((game.global.world+10 - 1) % 5)) + (game.global.world+10 - 1)) + 1) + " ("+getEmpowerment(15)+")</span>";
        $("#nature_text").html(nature_text);
    }, 500);

    var nature_button = $("<span id='nature_button' class='btn btn-primary' style='position:absolute;bottom:10px;left:15px;height:25px;width:50px;padding:2px 4px;'>More</span>");
    $("#gridRow").append(nature_button);

    function show_nature(){
        var nature_popup = $("<div id='nature_popup' class='tooltipdiv' style='display: block;top: 311px;left: 25%;height:50vh;overflow:auto;'><div id='nature_popup_title' style='font-size:1.2em;text-align:center;'>Nature zones</div><span id='nature_popup_close_btn' style='position:absolute;top:3px;right:3px;' class='btn btn-danger'>Close</span><hr><div id='nature_popup_content'></div></div>");
        $("body").append(nature_popup);
        $("#nature_popup_close_btn").click(close_nature);
        $("#nature_popup_content").append("<span style='font-size:1.1em' class='badge badbadge badName"+getEmpowerment()+"'>"+(game.global.world) + " ("+getEmpowerment()+")</span> > ");
        for(var i = 0; i < 20; i++){
            var nature_text = "<span style='margin-bottom:5px; font-size:1.1em' class='badge badbadge badName"+getEmpowerment(5+i*5)+"'>"+ (((5 - ((game.global.world+(i*5) - 1) % 5)) + (game.global.world+(i*5) - 1)) + 1) + " ("+getEmpowerment(5+i*5)+")</span> > ";
            $("#nature_popup_content").append(nature_text);
        }
    }

    function close_nature(){
        $("#nature_popup").remove();
    }

    $("#nature_button").click(show_nature);


    
    var heirloom_div = $("<div id='heirloom_div' style='height:auto;position:absolute;bottom:70px;box-shadow:none !important;border:none !important;'></div>");
    $("#gridRow").append(heirloom_div);

    var heirloom_updater = setInterval(function(){
        update_heirlooms();
        
    }, 1000);

    var once = false;


    function update_heirlooms(){
        //if(once) return;
        once = true;
        $('#heirloom_div').empty();
        var td_style = "padding-left:10px;padding-right:10px;cursor:pointer;font-size:1vw;height:35px;border: 3px solid #222;background-color:#333;";
        var span1_style = "height:35px;display:block;float:left;font-size:1.6vw;margin-right:5px;line-height:35px;"
        var span2_style = "height:35px;vertical-align: middle;line-height:35px;";
        var subtext_style = "font-size:0.8vw;display:block;line-height:15px;height:15px;margin-right:10px;";

        var shields = [];
        var staffs = [];

        for(var i = 0; i < game.global.heirloomsCarried.length; i++){
            if(game.global.heirloomsCarried[i].type == "Staff"){staffs.push(i);}
            else if(game.global.heirloomsCarried[i].type == "Shield") {shields.push(i);}
        }
        $('#heirloom_div').append($("<table id='heirloom_table_shields' style='float:left;box-shadow:none !important;border-collapse:collapse !important;'><tr id='heirloom_table_shields_tr'></tr></table>"));
        $(shields).each(function(){
            var id = this;
            var heirloom = game.global.heirloomsCarried[this];
            var icon = getHeirloomIcon(heirloom);
            var td = $("<td style='"+td_style+"'>"+
                           "<span style='"+span1_style+"' class='"+icon+" heirloomRare" +
                           heirloom.rarity+"'></span><span style='margin-left:7px;"+span2_style+"'>"+heirloom.name+"</span></td>");
            $('#heirloom_table_shields_tr').append(td);
            td.click(function(){
                equipHeirloom(selectHeirloom(id, 'heirloomsCarried'));
                update_heirlooms();
                return;
            });
            /*$(heirloom.mods).each(function(){
                var td2 = $("<tr><td><span style='margin-left:44px;"+subtext_style+"'>"+
                            prettify(scaleHeirloomModUniverse(heirloom.type, this[0], this[1])) + '% ' + game.heirlooms[heirloom.type][this[0]].name +
                            "</span></td></tr>")
                $('#heirloom_table_shields').append(td2);
            });*/
        });

        $('#heirloom_div').append($("<table id='heirloom_table_staffs' style='float:left;clear:both;margin-top:10px;border: 3px solid #222;background-color:#333;box-shadow:none !important;border-collapse:collapse !important;'><tr id='heirloom_table_staffs_tr'></tr></table>"));
        $(staffs).each(function(){
            var id = this;
            var heirloom = game.global.heirloomsCarried[this];
            var icon = getHeirloomIcon(heirloom);
            var td = $("<td style='"+td_style+"'>"+
                           "<span style='margin-left:-4px;"+span1_style+"' class='"+icon+" heirloomRare" +
                           heirloom.rarity+"'></span><span style='margin-left:4px;"+span2_style+"'>"+heirloom.name+"</span></td>");
            $('#heirloom_table_staffs_tr').append(td);
            td.click(function(){
                equipHeirloom(selectHeirloom(id, 'heirloomsCarried'));
                update_heirlooms();
                return;
            });
            /*$(heirloom.mods).each(function(){
                var td2 = $("<tr><td><span style='margin-left:45px;"+subtext_style+"'>"+
                            prettify(scaleHeirloomModUniverse(heirloom.type, this[0], this[1])) + '% ' + game.heirlooms[heirloom.type][this[0]].name +
                            "</span></td></tr>")
                $('#heirloom_table_staffs').append(td2);
            });*/
        });

        /*
        for(var i = 0; i < game.global.heirloomsCarried.length; i++){
            var id = i;
            var heirloom = game.global.heirloomsCarried[i];
            var icon = getHeirloomIcon(heirloom);
            //alert(game.global.heirloomsCarried[i].name);
            var hlabel = $("<span style='cursor:pointer;font-size:0.8vw;display:block;float:left;height:50px;'>"+
                           "<span style='display:block;float:left;font-size:1.6vw;margin-right:5px;line-height:50px;' class='"+icon+" heirloomRare" +
                           heirloom.rarity+"'></span> <span style='display:block;float:right;vertical-align: middle;line-height:50px;'>"+heirloom.name+"</span></span>");
            hlabel.click(function(){
                //alert(id);
                equipHeirloom(selectHeirloom(id, 'heirloomsCarried'));
                update_heirlooms();
                return;
            });
            heirloom_div.append(hlabel);
            if(i < game.global.heirloomsCarried.length-1){
                heirloom_div.append($("<span style='display:block;width:20px;height:5px;text-alignment:center;float:left;'></span>"))

            }
        }
        */
    }







    // Perky button

    var perky_button = $("<span id='perky_button' class='btn btn-primary' style='position:absolute;bottom:10px;right:200px;'>Perky</span>");
    $("#gridRow").append(perky_button);

    function open_perky(){
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val(save(true)).select();
        document.execCommand("copy");
        $temp.remove();
        window.open("https://grimy.github.io/perks.html");
    }
    $("#perky_button").click(open_perky);

    // Surky button

    var surky_button = $("<span id='surky_button' class='btn btn-primary' style='position:absolute;bottom:10px;right:130px;'>Surky</span>");
    $("#gridRow").append(surky_button);

    function open_surky(){
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val(save(true)).select();
        document.execCommand("copy");
        $temp.remove();
        window.open("https://nsheetz.github.io/perks/");
    }
    $("#surky_button").click(open_surky);


    // Story button
    
    var story_button = $("<span id='story_button' class='btn btn-primary' style='position:absolute;bottom:10px;right:25px;'>Story so far</span>");
    $("#gridRow").append(story_button);

    function show_story(){
        var story_popup = $("<div id='story_popup' class='tooltipdiv' style='display: block;top: 311px;left: 25%;height:50vh;overflow:auto;'><div id='story_popup_title' style='font-size:1.2em;text-align:center;'>The story so far</div><span id='story_popup_close_btn' style='position:absolute;top:3px;right:3px;' class='btn btn-danger'>Close</span><hr><div id='story_popup_content'></div></div>");
        $("body").append(story_popup);
        $("#story_popup_close_btn").click(close_story);
        var highest = 1;
        if(game.global.universe == 2){
            highest = game.global.highestRadonLevelCleared;
        }else{
            highest = game.global.highestLevelCleared;
        }
        for(var i = 1;i<=highest;i++){
            var msgText = getWorldText(i);
            if(msgText){
                var story_piece = $("<p>Z:"+i+" "+msgText+"</p>");
                $("#story_popup_content").prepend(story_piece);
            }
        }
    }

    function close_story(){
        $("#story_popup").remove();
    }

    $("#story_button").click(show_story);

    


})();
document.addEventListener('keydown', function (e){
    var key = e.which || e.keyCode;
    if(key == 81) // q
    {
        selectAdvMapsPreset(1);
        //buyMap();
    }else if(key == 87) // w
    {
        selectAdvMapsPreset(2);
        //buyMap();
    }else if(key == 69) // e
    {
        selectAdvMapsPreset(3);
        //buyMap();
    }else if(key == 82) // r
    {
        selectAdvMapsPreset(4);
        //buyMap();
    }else if(key == 84) // t
    {
        //selectAdvMapsPreset(5);
        //buyMap();
    }else if(key == 226)
    {
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val(save(true)).select();
        document.execCommand("copy");
        $temp.remove();
        if(game.global.universe == 2){
            window.open("https://nsheetz.github.io/perks/");
        }else{
            window.open("https://grimy.github.io/perks.html");
        }
        
    }
});



