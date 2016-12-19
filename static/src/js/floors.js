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
                    if (localStorage.getItem("'" + tables[i].name + "'")) {
                        tables[i].color = "rgb(235, 109, 109)";
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
            this.previous_order_id = false;
            return _super_posmodel.initialize.call(this, session, attributes);
        },

        // Overwritten methods
        set_table: function (table) {
            if ((this.change_table)) {
                    if (!table) { // no table ? go back to the floor plan, see ScreenSelector
                        this.set_order(null);
                    } else {
                        var room_empty;
                        if(table.color == "rgb(53,211,116)" || table.color == "rgb(130,233,171)"){
                            room_empty = true;
                        }else{
                            room_empty=false;
                        }
                        if(room_empty) {
                            this.table.color = "rgb(130,233,171)";
                            //hacer cambios con la anterior mesa para ponerlas a la nueva mesa
                            var change = localStorage.getItem("'" + this.table.name + "'");
                            localStorage.removeItem("'" + this.table.name + "'");
                            localStorage.setItem("'" + table.name + "'", change);
                            console.log("localstorageafter", localStorage);
                            var dates = new Date(localStorage.getItem("'" + table.name + "'"));
                            clockStart.innerHTML = dates.getHours() + ':' + dates.getMinutes() + ' - ' + dates.getDate() + '/' + (dates.getMonth() + 1) + '/' + dates.getYear();

                            var change_couple = localStorage.getItem("'" + this.table.name + "-ParejaExtra'");
                            localStorage.removeItem("'" + this.table.name + "-ParejaExtra'");
                            localStorage.setItem("'" + table.name + "-ParejaExtra'", change_couple);

                            this.table = table;
                            var orderss = this.get_order_list();
                            if (orderss.length) {
                                this.set_order(orderss[0]);
                                this.updateTimer();
                            } else {
                                Minutos.innerHTML = ":00";
                                Horas.innerHTML = "00";
                            }
                        }
                        else{
                            alert("La habitacion ya se encuentra ocupada");
                            this.change_table = false;
                            return;
                        }
                    }
            }
            else {
                _super_posmodel.set_table.apply(this, arguments);
            }


            if (!table) { // no table ? go back to the floor plan, see ScreenSelector
                this.set_order(null);
            }
            else {
                if (this.change_table) {
                    this.previous_order_id.table = table;
                    this.change_table = false;
                }
                // table ? load the associated orders  ...
                this.table = table;
                var orders = this.get_order_list();
                if (orders.length) {
                    this.set_order(orders[0]); // and go to the first one ...

                    var date = new Date(localStorage.getItem("'" + table.name + "'"));
                    clockStart.innerHTML= date.getHours() + ':' + date.getMinutes() + ' - ' + date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getYear();

                } else {
                    this.add_new_order();  // or create a new order with the current table

                    var order = this.get_order();
                    var table = order.table;
                    localStorage.setItem("'" + table.name + "'", order.creation_date);
                    var date = new Date(localStorage.getItem("'" + table.name + "'"));
                    clockStart.innerHTML= date.getHours() + ':' + date.getMinutes() + ' - ' + date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getYear();

                    this.change_color_of_table();
                    Minutos.innerHTML = ":00";
                    Horas.innerHTML = "00";
                }

            }
        },
        updateTimer: function () {
            var order = this.get_order();
            var table = order.table;
            //diferencia entra la actual y la creada para obtener el tiempo transcurrido
            var actual_hour = new Date(); // Current date now.

            var creation_hour = new Date(localStorage.getItem("'" + table.name + "'"));// Start of 2010.
            var time_room = (actual_hour - creation_hour); // Difference in milliseconds.
            //tiempo en milisegundos
            var time = parseInt((time_room) / 1000);
            //
            //transformar el tiempo de milisegundos a hr,min,seg
            var milliseconds = parseInt((time_room % 1000) / 100)
                , seconds = parseInt((time_room / 1000) % 60)
                , minutes = parseInt((time_room / (1000 * 60)) % 60)
                , hours = parseInt((time_room / (1000 * 60 * 60)) % 24);

            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;

            //Centesimas.innerHTML = ":" + milliseconds;
            // Segundos.innerHTML = ":" + seconds;
            Minutos.innerHTML = ":" + minutes;
            Horas.innerHTML = hours;

        },
        change_color_of_table: function () {
            var order = this.get_order();
            var table = order.table;
            if (order.get_orderlines().length > 0) {
                table.color = "rgb(235, 109, 109)"; // Fixme: client side change doesn't storage in the database
            } else {
                table.color = "rgb(130, 233, 171)";
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
                    table.color = "rgb(130, 233, 171)";
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
            var extra_product_id_for_couple = this.get_additional_couple_product_id_for_table();

            var orderExtracouple;

            //default_couple_product_id
            var default_product_id = this.get_default_couple_product_id_for_table();
            var quantity = 0;
            //validar el update order
            var list_products = order.orderlines.models;
            var quantity_default_couple=0;
            var modifyQuantityCouple = 0;
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
                if ((quantity/quantity_default_couple) == extra_product_qty_couple) {
                    return false;
                } else {
                    extra_product_qty_couple = (extra_product_qty_couple - (quantity/quantity_default_couple))*quantity_default_couple;
                    modifyQuantityCouple = extra_product_qty_couple + quantity
                    this.modify_extra_product_to_current_order(modifyQuantityCouple,orderExtracouple);
                }
            }else{
                extra_product_qty_couple = extra_product_qty_couple * quantity_default_couple;
                this.add_extra_product_couple_to_current_order(extra_product_qty_couple);
            }
        },
        calculate_extra_product: function (minutes_apart) {
            var order = this.get_order(),
                table = order.table,
                wait_time = table.wait_time,
                extra_time = table.extra_time,
                wait_time_couple = table.wait_time_couple,
                extra_time_couple = table.extra_time_couple;

            var extra_minutes = Math.abs(minutes_apart - wait_time);
            var extra_product_qty = Math.ceil(extra_minutes / extra_time);

            var extra_product_id = this.get_extra_product_id_for_table();

            var orderExtra;
            //validar el update order
            var list_products = order.orderlines.models;
            var quantity = 0;
            var modifyQuantityProduct = 0;
            for (var product in list_products) {
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
                    this.modify_extra_product_to_current_order(modifyQuantityProduct,orderExtra);
                }
            }else {
                this.add_extra_product_to_current_order(extra_product_qty,orderExtra);
            }
        },
        modify_extra_product_to_current_order : function(extra_product_qty,orderExtra){
            orderExtra.set_quantity(extra_product_qty);
        },
        get_additional_couple_product_id_for_table: function () {
            var order = this.get_order(),
                table = order.table;
            var defaultProductId = table.additional_couple_product_id;
            if (defaultProductId) {
                return defaultProductId[0];
            }
            return false;
        }, get_default_couple_product_id_for_table: function () {
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
            if (color === "rgb(235, 109, 109)") { // Not allow to change to red
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
                table.color = "rgb(235, 109, 109)";
            } else {
                table.color = "rgb(130, 233, 171)";
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
            this.pos.updateTimer();
            this.updateTimer_Order();
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
            var added_couple = new Date(localStorage.getItem("'" + table.name + "-ParejaExtra'"));
            var difference_x_couple = Math.abs(now - added_couple);
            var minutes_apart_x_couple = Math.floor((difference_x_couple / 1000) / 60);
            if (minutes_apart_x_couple > table.wait_time_couple) {
                this.pos.calculate_extra_product_couple(minutes_apart_x_couple);
            }
        }
    });

    //var intervalExtraHour = setInterval( this.pos.button_click(), 3000);

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
        template: 'TableClockStart'
    });

    screens.define_action_button({
        'name': 'time_start',
        'widget': TableClockStart,
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
                if(this.existence_couples_in_order()) {
                    if (this.couples_in_order_table()) {
                        order.add_product(default_product);
                        localStorage.setItem("'" + table.name + "-ParejaExtra'", Date());
                    } else {
                        alert("No se puede agregar mas parejas a la habitacion");
                    }
                }else{
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
