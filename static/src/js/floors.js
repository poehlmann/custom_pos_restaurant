odoo.define('custom_pos_restaurant.floors', function (require) {
    var models = require('point_of_sale.models');
    var floors = require('pos_restaurant.floors');
    var chrome = require('point_of_sale.chrome');
    var screens = require('point_of_sale.screens');


    models.load_models({
        model: 'restaurant.table',
        fields: ['name', 'width', 'height', 'position_h', 'position_v', 'shape', 'floor_id', 'color', 'seats',
            'default_product_id', 'additional_product_id', 'wait_time', 'extra_time', 'default_couple_product_id',
            'additional_couple_product_id', 'wait_time_couple', 'extra_time_couple'],
        loaded: function (self, tables) {
            self.tables_by_id = {};
            for (var i = 0; i < tables.length; i++) {
                self.tables_by_id[tables[i].id] = tables[i];
                var floor = self.floors_by_id[tables[i].floor_id[0]];
                if (floor) {
                    //cambiar el color de la mesa a rojo si esta con una orden
                    if (localStorage.getItem("'" + tables[i].name + "'")) {
                        tables[i].color = "red";
                    }
                    //cambiar el color de la mesa si esta el tiempo detenido
                    if (localStorage.getItem("'stop-" + tables[i].name + "'")) {
                        tables[i].color = "yellow";
                    }
                    floor.tables.push(tables[i]);
                    tables[i].floor = floor;

                }
            }
        }
    });

    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({

        initialize: function (session, attributes) {
            this.change_table = false;
            this.previous_order = false;
            this.previous_order_id = false;
            this.previous_order_couple = false;
            this.quantity_of_couples = 0;
            return _super_posmodel.initialize.call(this, session, attributes);
        },

        //detalle de la entrada y salida de las habitaciones
        in_out_room: function (in_out) {
            console.log("in_out", in_out);
            var orderlines;
            var line;
            var default_product_id;
            //agregar nota de hora de ingreso al producto
            default_product_id = this.get_default_product_id_for_table();
            if (default_product_id) {
                line = this.get_order();
            }
            orderlines = line.get_orderlines();
            if (orderlines) {
                if (in_out == "entrada") {
                    // console.log("orderlines[0]",orderlines[0]);
                    ////////////////
                    var prueba_name = orderlines[0].product.display_name;
                    console.log("prueba_name", prueba_name);
                    prueba_name += " hora de entrada:" + this.show_date();
                    orderlines[0].product.display_name = prueba_name;
                    ////////////////
                    // orderlines[0].set_note("hora de entrada:" + this.show_date());
                    // console.log("nota:", orderlines[0].get_note());
                }
                else if (in_out == "salida") {
                    //agregar nota de hora de salida al producto
                    // var nota = orderlines[0].get_note();
                    // console.log("nota", nota);
                    //orderlines[0].set_note(nota + "</br> hora de salida:" + this.show_date());
                    /////////////////////////////
                    var prueba_name = orderlines[0].product.display_name;
                    console.log("prueba_name", prueba_name);
                    prueba_name += " </br> hora de salida:" + this.show_date();
                    orderlines[0].product.display_name = prueba_name;
                    ///////////////////////////////
                    //console.log("hora de salida:", orderlines[0].get_note());
                }
            }
        },

        change_rooms_on_cache: function (before_table, after_table) {
            console.log("before_table", localStorage);
            var change = localStorage.getItem("'" + before_table.name + "'");
            localStorage.removeItem("'" + before_table.name + "'");
            localStorage.setItem("'" + after_table.name + "'", change);
            var change_couple = localStorage.getItem("'" + before_table.name + "-ParejaExtra'");
            localStorage.removeItem("'" + before_table.name + "-ParejaExtra'");
            localStorage.setItem("'" + after_table.name + "-ParejaExtra'", change_couple);
            console.log("after_table", localStorage);
        },

        // Overwritten methods
        set_table: function (table) {
            console.log("this.change_table", this.change_table);
            if ((this.change_table)) {

                //cuando se quiere cambiar una orden de habitacion
                if (!table) { // no table ? go back to the floor plan, see ScreenSelector
                    this.set_order(null);
                } else {
                    //preguntamos si las habitaciones estan ocupadas o estan detenidas
                    var room_empty;
                    room_empty = !!((table.color !== "red") && (table.color !== "yellow"));

                    console.log("room_empty", room_empty);

                    if (room_empty) {
                        this.table.color = "green";
                        //hacer cambios con la anterior mesa para ponerlas a la nueva mesa
                        // "table" es la nueva mesa - "this.table" es la mesa anterior
                        clockStart.innerHTML = this.show_date(localStorage.getItem("'" + table.name + "'"));
                        //this.change_rooms_on_cache(this.table,table);

                        /**********************************************/
                        console.log("before_table", localStorage);
                        var change = localStorage.getItem("'" + this.table.name + "'");
                        localStorage.removeItem("'" + this.table.name + "'");
                        localStorage.setItem("'" + table.name + "'", change);
                        clockStart.innerHTML = this.show_date(localStorage.getItem("'" + table.name + "'"));
                        var change_couple = localStorage.getItem("'" + this.table.name + "-ParejaExtra'");
                        localStorage.removeItem("'" + this.table.name + "-ParejaExtra'");
                        localStorage.setItem("'" + table.name + "-ParejaExtra'", change_couple);
                        console.log("after_table", localStorage);
                        /**********************************************/

                        this.table = table;
                        var orderss = this.get_order_list();
                        if (orderss.length) {
                            this.set_order(orderss[0]);
                            this.in_out_room("salida");
                            this.updateTimer();
                        } else {
                            this.reset_clock();
                        }
                    }
                    else {
                        alert("La habitacion ya se encuentra ocupada");
                        this.change_table = false;
                        return;
                    }
                }
                return;
            }
            else {
                console.log("arguments", arguments);
                _super_posmodel.set_table.apply(this, arguments);
            }


            if (!table) { // no table ? go back to the floor plan, see ScreenSelector
                this.set_order(null);
            }
            else {
                // table ? load the associated orders  ...
                this.table = table;
                if (this.change_table) {
                    //cambia los valores de la variable "change_table" una vez ya se cambio de habitacion
                    this.previous_order_id.table = table;
                    this.change_table = false;
                }
                if (localStorage.getItem("'stop-" + this.table.name + "'")) {
                    //en el caso de que se haya detenido el tiempo, cambia la interface para mostrar amarillo y cambiar la orden
                    Detener.innerHTML = "Continuar";
                    this.table.color = "yellow";
                }
                else {
                    Detener.innerHTML = "Detener";
                }
                var orders = this.get_order_list();
                if (orders.length) {
                    console.log("agregando fuera del change table???");
                    //si existen orden anteriormente en la habitacion obtiene la primera que obtuvo
                    this.set_order(orders[0]); // and go to the first one ...
                    clockStart.innerHTML = this.show_date(localStorage.getItem("'" + table.name + "'"));
                } else {
                    //crea la orden inicial cuando ingresa por primera vez a la habiacion
                    this.add_new_order();  // or create a new order with the current table
                    var order = this.get_order();
                    var tables = order.table;
                    localStorage.setItem("'" + tables.name + "'", order.creation_date);
                    this.in_out_room("entrada");
                    clockStart.innerHTML = this.show_date(localStorage.getItem("'" + tables.name + "'"));
                    this.change_color_of_table();
                    this.reset_clock();
                }

            }
        },

        reset_clock: function () {
            Minutos.innerHTML = ":00";
            Horas.innerHTML = "00";
        },

        show_date: function (dates) {
            var date;

            console.log("dates", dates);

            date = (typeof(dates) !== "undefined" && dates !== null) ? new Date(dates) : new Date();

            var create_hours = (date.getHours() < 10) ? "0" + date.getHours() : date.getHours();
            var create_minutes = (date.getMinutes() < 10) ? "0" + date.getMinutes() : date.getMinutes();
            var actuallydate = (date.getDate() < 10) ? "0" + date.getDate() : date.getDate();
            var actuallyMonth = ((date.getMonth()) < 10) ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
            console.log("time= ", create_hours + ':' + create_minutes + ' - ' + actuallydate + '/' + actuallyMonth + '/' + date.getFullYear());
            return create_hours + ':' + create_minutes + ' - ' + actuallydate + '/' + actuallyMonth + '/' + date.getFullYear();
        },

        updateTimer: function () {
            var order = this.get_order();
            var table = order.table;
            //diferencia entre la actual y la creada para obtener el tiempo transcurrido
            var actual_hour = new Date(); // Current date now.

            var one_day = 1000 * 60 * 60 * 24;

            var creation_hour = new Date(localStorage.getItem("'" + table.name + "'"));

            var time_room = (actual_hour - creation_hour); // Difference in milliseconds.
            //tiempo en milisegundos
            var time = parseInt((time_room) / 1000);
            //
            //transformar el tiempo de milisegundos a hr,min,seg
            var milliseconds = parseInt((time_room % 1000) / 100)
                , seconds = parseInt((time_room / 1000) % 60)
                , minutes = parseInt((time_room / (1000 * 60)) % 60)
                , hours = parseInt((time_room / (1000 * 60 * 60)) % 24);


            var days = Math.round(time_room / one_day);
            hours = (days > 0) ? (24 * days) + hours : 0;
            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;

            Minutos.innerHTML = ":" + minutes;
            Horas.innerHTML = hours;

        },
        change_color_of_table: function () {
            var order = this.get_order();
            var table = order.table;
            if (order.get_orderlines().length > 0) { // is not working
                table.color = "red"; // Fixme: client side change doesn't storage in the database
            } else {
                table.color = "green";
            }

        },
        add_new_order: function () {
            _super_posmodel.add_new_order.call(this);
            this.add_default_product_to_current_order();
        },
        on_removed_order: function (removed_order, index, reason) {
            if (this.config.iface_floorplan) {
                var order_list = this.get_order_list();
                if ((reason === 'abandon' || removed_order.temporary) && order_list.length > 0) {
                    this.set_order(order_list[index] || order_list[order_list.length - 1]);
                } else {
                    var table = this.table;
                    table.color = "green";
                    var deleteItem = table.name;
                    localStorage.removeItem("'" + deleteItem + "'");
                    localStorage.removeItem("'" + table.name + "-ParejaExtra'");
                    // back to the floor plan
                    this.set_table(null);
                }
            } else {
                _super_posmodel.on_removed_order.apply(this, arguments);
            }
        },
        // New methods
        add_default_product_to_current_order: function () {
            var default_product_id = this.get_default_product_id_for_table();
            if (default_product_id) {
                var default_product = this.db.get_product_by_id(default_product_id);
                var order = this.get_order();
                order.add_product(default_product);
            }
        },
        get_default_product_id_for_table: function () {
            var order = this.get_order(),
                table = order.table;
            var defaultProductId = table.default_product_id;
            if (defaultProductId) {
                return defaultProductId[0];
            }
            return false;
        },
        calculate_extra_product_couple: function (minutes_apart) {
            var order = this.get_order(),
                table = order.table,
                wait_time_couple = table.wait_time_couple,
                extra_time_couple = table.extra_time_couple;

            var extra_minutes_couple = Math.abs(minutes_apart - wait_time_couple);
            var extra_product_qty_couple = Math.ceil(extra_minutes_couple / extra_time_couple);


            var orderExtracouple;
            var orderExtraExtracouple;

            //pareja extra
            var default_product_id = this.get_default_couple_product_id_for_table();
            //hora extra pareja extra
            var extra_product_id_for_couple = this.get_additional_couple_product_id_for_table();
            var quantity = 0;
            //validar el update order
            var list_products = order.orderlines.models;
            var quantity_default_couple = 0;
            var modifyQuantityCouple = 0;

            //horas extras de la habitacion con parejas extras de una anterior orden
            if (this.previous_order_couple) {
                for (product in list_products) {
                    if (list_products[product].product.id == this.previous_order_couple) {
                        quantity = list_products[product].quantity;

                    }
                }
                if (quantity == extra_product_qty_couple) {
                    return false;
                } else {
                    var quantity_previous_couple = 0;
                    for (var product in list_products) {
                        if (list_products[product].product.id == extra_product_id_for_couple) {
                            orderExtraExtracouple = list_products[product];
                            quantity_previous_couple = list_products[product].quantity;

                        }
                    }

                    if (orderExtraExtracouple) {

                        if ((quantity / this.quantity_of_couples) == extra_product_qty_couple) {
                            return false;
                        } else {


                            extra_product_qty_couple = (extra_product_qty_couple - (quantity / this.quantity_of_couples)) * this.quantity_of_couples;
                            modifyQuantityCouple = extra_product_qty_couple + quantity;

                            this.modify_extra_product_to_current_order(modifyQuantityCouple, orderExtraExtracouple);
                        }
                    } else {
                        extra_product_qty_couple = Math.abs(quantity - extra_product_qty_couple) * this.quantity_of_couples;

                        this.add_extra_product_couple_to_current_order(extra_product_qty_couple);
                    }
                }

            }
            else {
                //calcular el producto extra de pareja actual de la habitacion
                for (var product in list_products) {
                    if (list_products[product].product.id == default_product_id) {
                        quantity_default_couple = list_products[product].quantity;
                    }
                    if (list_products[product].product.id == extra_product_id_for_couple) {
                        orderExtracouple = list_products[product];
                        quantity += list_products[product].quantity;
                    }
                }
                if (orderExtracouple) {
                    if ((quantity / quantity_default_couple) == extra_product_qty_couple) {
                        return false;
                    } else {
                        extra_product_qty_couple = (extra_product_qty_couple - (quantity / quantity_default_couple)) * quantity_default_couple;
                        modifyQuantityCouple = extra_product_qty_couple + quantity;
                        this.modify_extra_product_to_current_order(modifyQuantityCouple, orderExtracouple);
                    }
                } else {
                    extra_product_qty_couple = extra_product_qty_couple * quantity_default_couple;
                    this.add_extra_product_couple_to_current_order(extra_product_qty_couple);
                }
            }
        },
        calculate_extra_product: function (minutes_apart) {
            var order = this.get_order(),
                table = order.table,
                wait_time = table.wait_time,
                extra_time = table.extra_time;

            var extra_minutes = Math.abs(minutes_apart - wait_time);
            var extra_product_qty = Math.ceil(extra_minutes / extra_time);

            var extra_product_id = this.get_extra_product_id_for_table();

            var orderExtra;
            var orderExtra_previous_order;
            //validar el update order
            var list_products = order.orderlines.models;
            var quantity = 0;
            var modifyQuantityProduct = 0;
            var modifyQuantityProduct_new = 0;
            var product;
            //horas extras de la habitacion de una anterior orden
            if (this.previous_order) {
                for (product in list_products) {
                    if (list_products[product].product.id == this.previous_order) {
                        quantity = list_products[product].quantity;
                    }
                }
                if (quantity == extra_product_qty) {
                    return false;
                } else {
                    for (product in list_products) {
                        var quantity_new = 0;
                        if (list_products[product].product.id == extra_product_id) {
                            orderExtra_previous_order = list_products[product];
                            quantity_new = list_products[product].quantity;
                        }
                    }
                    if (orderExtra_previous_order) {
                        modifyQuantityProduct_new = extra_product_qty - quantity - quantity_new;
                    } else {
                        modifyQuantityProduct_new = extra_product_qty - quantity;
                    }
                }

            }

            //calculo de la orden de la mesa actual
            for (product in list_products) {
                if (list_products[product].product.id == extra_product_id) {
                    orderExtra = list_products[product];
                    quantity += list_products[product].quantity;
                }
            }

            if (orderExtra) {
                if (quantity == extra_product_qty) {
                    return false;
                } else {
                    extra_product_qty = extra_product_qty - quantity;
                    modifyQuantityProduct = extra_product_qty + quantity;
                    this.modify_extra_product_to_current_order(modifyQuantityProduct, orderExtra);
                }
            } else if (this.previous_order) {
                this.add_extra_product_to_current_order(modifyQuantityProduct_new, orderExtra_previous_order);

            }
            else {

                this.add_extra_product_to_current_order(extra_product_qty, orderExtra);

            }

        },
        modify_extra_product_to_current_order: function (extra_product_qty, orderExtra) {

            orderExtra.set_quantity(extra_product_qty);
        },
        get_quantity_of_couples: function () {
            var order = this.get_order();
            var default_couple = this.get_default_couple_product_id_for_table();
            var list_products = order.orderlines.models;
            var quantity = 0;
            var product;
            for (product in list_products) {
                if (list_products[product].product.id == default_couple) {
                    quantity = list_products[product].quantity;
                }
            }
            return quantity;
        },
        get_additional_couple_product_id_for_table: function () {
            var order = this.get_order(),
                table = order.table;
            var defaultProductId = table.additional_couple_product_id;
            if (defaultProductId) {
                return defaultProductId[0];
            }
            return false;
        },

        get_default_couple_product_id_for_table: function () {
            var order = this.get_order(),
                table = order.table;
            var defaultProductId = table.default_couple_product_id;
            if (defaultProductId) {
                return defaultProductId[0];
            }
            return false;
        },

        add_extra_product_couple_to_current_order: function (extra_product_qty) {
            var order = this.get_order();
            var extra_product_id = this.get_additional_couple_product_id_for_table();
            if (extra_product_id) {
                var extra_product = this.db.get_product_by_id(extra_product_id);
                order.add_product(extra_product, {quantity: (extra_product_qty)});
            }
        },
        add_extra_product_to_current_order: function (extra_product_qty) {
            var extra_product_id = this.get_extra_product_id_for_table();
            if (extra_product_id) {
                var extra_product = this.db.get_product_by_id(extra_product_id);
                var order = this.get_order();
                order.add_product(extra_product, {quantity: extra_product_qty});
            }
        },
        get_extra_product_id_for_table: function () {
            var order = this.get_order(),
                table = order.table;
            var extraProductId = table.additional_product_id;
            if (extraProductId) {
                return extraProductId[0];
            }
            return false;
        }
    });

    floors.TableWidget = floors.TableWidget.include({
        // Overwritten methods
        set_table_color: function (color) {
            if (color === "red") { // Not allow to change to red
            } else {
                this.table.color = _.escape(color);
                this.$el.css({'background': this.table.color});
            }

        }
    });

    chrome.OrderSelectorWidget.include({
        // Overwritten methods
        floor_button_click_handler: function () {
            this.change_color_of_table();
            this.pos.set_table(null);
        },
        change_color_of_table: function () {
            var order = this.pos.get_order();
            var orderlines = order.get_orderlines();
            var table = order.table;
            if (orderlines.length > 0) {
                table.color = "red";
            } else {
                table.color = "green";
            }
            if (localStorage.getItem("'stop-" + table.name + "'")) {
                table.color = "yellow";
            }
        }
    });

    var TableUpdateOrderButton = screens.ActionButtonWidget.extend({
        template: 'TableUpdateOrderButton',
        update_order_time: function () {
            if (this.pos.get_order()) {
                return this.pos.get_order().customer_count;
            } else {
                return 0;
            }
        },
        button_click: function () {
            if (Detener.innerHTML != "Continuar") {
                this.pos.updateTimer();
                this.updateTimer_Order();
            }
            else {
                alert("Por favor, continue el tiempo detenido para calcular el tiempo total");
            }
        },

        updateTimer_Order: function () {
            var order = this.pos.get_order(),
                table = order.table,
                creation_date = new Date(localStorage.getItem("'" + table.name + "'")),
                now = new Date();
            var difference = Math.abs(now - creation_date);
            var minutes_apart = Math.floor((difference / 1000) / 60);
            if (minutes_apart > table.wait_time) {
                this.pos.calculate_extra_product(minutes_apart);
            }
            //for extra couple
            var list_products = order.orderlines.models;
            var order_couple = false;
            var default_product_id = this.pos.get_default_couple_product_id_for_table();
            for (var product in list_products) {
                if (list_products[product].product.id == default_product_id) {
                    order_couple = list_products[product];
                }
            }
            if (order_couple) {
                var added_couple = new Date(localStorage.getItem("'" + table.name + "-ParejaExtra'"));
                var difference_x_couple = Math.abs(now - added_couple);
                var minutes_apart_x_couple = Math.floor((difference_x_couple / 1000) / 60);
                if (minutes_apart_x_couple > table.wait_time_couple) {
                    this.pos.calculate_extra_product_couple(minutes_apart_x_couple);
                }
            }
        }
    });

    screens.define_action_button({
        'name': 'update_order_time',
        'widget': TableUpdateOrderButton,
        'condition': function () {
            return this.pos.config.iface_floorplan;
        }
    });

    TableUpdateTimeButton = screens.ActionButtonWidget.extend({
        template: 'TableUpdateTimeButton',
        button_click: function () {
            var date = new Date();
            var c = document.getElementsByTagName("p")[0];
        }
    });

    screens.define_action_button({
        'name': 'update_time',
        'widget': TableUpdateTimeButton,
        'condition': function () {
            return this.pos.config.iface_floorplan;
        }
    });

    //put the clock when started the service

    TableClockStart = screens.ActionButtonWidget.extend({
        template: 'TableClockStart',
    });

    screens.define_action_button({
        'name': 'time_start',
        'widget': TableClockStart,
        'condition': function () {
            return this.pos.config.iface_floorplan;
        }
    });

    //Stop the time
    TableUpdateTimeStopButton = screens.ActionButtonWidget.extend({
        template: 'TableUpdateTimeStopButton',
        button_click: function () {
            var order = this.pos.get_order(),
                table = order.table;
            if (Detener.innerHTML == "Detener") {
                Detener.innerHTML = "Continuar";
                localStorage.setItem("'stop-" + table.name + "'", new Date());
            } else {
                Detener.innerHTML = "Detener";
                var stop_time_room = new Date(localStorage.getItem("'stop-" + table.name + "'"));
                var time_room = new Date(localStorage.getItem("'" + table.name + "'"));
                var actually_time = new Date();
                var difference_time = actually_time - stop_time_room;
                time_room.setTime(time_room.getTime() + difference_time);
                localStorage.setItem("'" + table.name + "'", new Date(time_room));
                localStorage.removeItem("'stop-" + table.name + "'");
            }
        }
    });
    screens.define_action_button({
        'name': 'time_stop',
        'widget': TableUpdateTimeStopButton,
        'condition': function () {
            return this.pos.config.iface_floorplan;
        }
    });

    //TableAddCoupleButton

    var TableAddCoupleButton = screens.ActionButtonWidget.extend({
        template: 'TableAddCoupleButton',
        update_order_time: function () {
            if (this.pos.get_order()) {
                return this.pos.get_order().customer_count;
            } else {
                return 0;
            }
        },
        button_click: function () {
            var order = this.pos.get_order();
            this.add_default_couple_product_to_current_order();
        },
        add_default_couple_product_to_current_order: function () {
            var default_product_id = this.get_default_couple_product_id();
            var default_product = this.pos.db.get_product_by_id(default_product_id);
            var order = this.pos.get_order();
            var table = order.table;
            if (default_product_id) {
                if (this.existence_couples_in_order()) {
                    if (this.couples_in_order_table()) {
                        order.add_product(default_product);
                        localStorage.setItem("'" + table.name + "-ParejaExtra'", Date());
                    } else {
                        alert("No se puede agregar mas parejas a la habitacion");
                    }
                } else {
                    order.add_product(default_product);
                    localStorage.setItem("'" + table.name + "-ParejaExtra'", Date());
                }
            }
        },
        existence_couples_in_order: function () {
            var default_product_id = this.pos.get_default_couple_product_id_for_table();
            var order = this.pos.get_order();
            var list_products = order.orderlines.models;
            var found = false;
            for (var product in list_products) {
                if (list_products[product].product.id == default_product_id) {
                    found = true;
                }
            }
            return found;
        },
        couples_in_order_table: function () {
            var now = new Date();
            var order = this.pos.get_order();
            var table = order.table;
            var date_order_couple_extra = new Date(localStorage.getItem("'" + table.name + "-ParejaExtra'", Date()));
            var difference = Math.abs(now - date_order_couple_extra);
            var minutes_apart = Math.floor((difference / 1000));
            if (minutes_apart > 15) {
                return false;
            } else {
                return true;
            }
        },
        get_default_couple_product_id: function () {
            var order = this.pos.get_order(),
                table = order.table;
            var defaultProductId = table.default_couple_product_id;
            if (defaultProductId) {
                return defaultProductId[0];
            }
            return false;
        },
        updateTimer_Order: function () {
            var order = this.pos.get_order(),
                table = order.table,
                creation_date = new Date(localStorage.getItem("'" + table.name + "'")),
                now = new Date();
            var difference = Math.abs(now - creation_date);
            var minutes_apart = Math.floor((difference / 1000) / 60);
            //
            if (minutes_apart > table.wait_time) {
                this.pos.calculate_extra_product(minutes_apart);
            }
        },

    });

    screens.define_action_button({
        'name': 'update_order_time',
        'widget': TableAddCoupleButton,
        'condition': function () {
            return this.pos.config.iface_floorplan;
        }
    });
});
