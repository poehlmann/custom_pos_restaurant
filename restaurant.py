from openerp import models, fields
from openerp.tools.translate import _


class RestaurantTable(models.Model):
    _inherit = 'restaurant.table'

    # New Fields
    default_product_id = fields.Many2one(string=_('Default product'), comodel_name='product.product',
                                         help=_('Only service products'))
    additional_product_id = fields.Many2one(string=_('Additional product'), comodel_name='product.product',
                                            help=_('Only service products'))
    wait_time = fields.Integer(string=_('Wait time'), default=60)
    extra_time = fields.Integer(string=_('Extra time'), default=15)
