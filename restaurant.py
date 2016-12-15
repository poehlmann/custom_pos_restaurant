from openerp import models, fields
from openerp.tools.translate import _


class RestaurantTable(models.Model):
    _inherit = 'restaurant.table'

    # New Fields
    default_product_id = fields.Many2one(string=_('Producto Habitacion'), comodel_name='product.product',
                                         help=_('Solo producto - servicio'))
    additional_product_id = fields.Many2one(string=_('Producto Hora Adicional'), comodel_name='product.product',
                                            help=_('Solo producto - servicio'))
    wait_time = fields.Integer(string=_('Tiempo Habitacion'), default=60)
    extra_time = fields.Integer(string=_('Tiempo Extra'), default=15)

    #extra couple
    default_couple_product_id = fields.Many2one(string=_('Producto Habitacion'), comodel_name='product.product',
                                         help=_('Solo producto - servicio'))
    additional_couple_product_id = fields.Many2one(string=_('Producto Hora Adicional'), comodel_name='product.product',
                                            help=_('Solo producto - servicio'))
    wait_time_couple = fields.Integer(string=_('Tiempo Habitacion'), default=60)
    extra_time_couple = fields.Integer(string=_('Tiempo Extra'), default=15)
