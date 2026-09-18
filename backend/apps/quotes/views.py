from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

SEED_QUOTES = []
IN_MEMORY_QUOTES = []
IN_MEMORY_MAX = 100   # never grow beyond this — prevents Render OOM crash

def _trim_memory_pool():
    """Keep IN_MEMORY_QUOTES capped. Oldest entries dropped; all data is
    already persisted to disk+MongoDB so nothing is lost."""
    global IN_MEMORY_QUOTES
    if len(IN_MEMORY_QUOTES) > IN_MEMORY_MAX:
        IN_MEMORY_QUOTES = IN_MEMORY_QUOTES[:IN_MEMORY_MAX]

from core.mongodb import get_collection
from core import storage

class QuoteListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import re
        from datetime import datetime

        def _sort_key(item):
            val = item.get('created_at') or item.get('created') or ''
            if isinstance(val, str) and val:
                try:
                    return datetime.fromisoformat(val.replace('Z', '+00:00')).timestamp()
                except Exception:
                    pass
            return 0

        user_email = request.query_params.get('email', '').strip()

        # Load from disk storage
        all_dict = {}
        for q in storage.load_quotes():
            qid = str(q.get('id', '')).strip().upper()
            if qid:
                all_dict[qid] = q

        # Also merge with in-memory quotes
        for q in IN_MEMORY_QUOTES:
            qid = str(q.get('id', '')).strip().upper()
            if qid and qid not in all_dict:
                all_dict[qid] = q
                storage.save_quote(q)

        # Merge with MongoDB if available
        try:
            col = get_collection('quotes')
            if col is not None:
                db_quotes = list(col.find({}, {'_id': 0}))
                for dbq in db_quotes:
                    qid = str(dbq.get('id', '')).strip().upper()
                    if qid and qid not in all_dict:
                        all_dict[qid] = dbq
                        storage.save_quote(dbq)
        except Exception:
            pass

        all_quotes = list(all_dict.values())
        if user_email:
            matched = [
                q for q in all_quotes
                if str(q.get('user_email', '')).strip().lower() == user_email.lower()
            ]
            matched.sort(key=_sort_key, reverse=True)
            return Response(matched)

        all_quotes.sort(key=_sort_key, reverse=True)
        return Response(all_quotes)

    def post(self, request):
        payload = request.data
        if not payload:
            return Response({'detail': 'Payload empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        user_email = payload.get('user_email') or (request.user.email if request.user and request.user.is_authenticated else '')
        if user_email:
            payload['user_email'] = user_email.lower()

        import uuid
        from datetime import datetime
        qid = payload.get('id')
        if not qid:
            qid = f"PQ-{datetime.utcnow().year}-{str(uuid.uuid4().hex[:6]).upper()}"
            payload['id'] = qid

        saved = storage.save_quote(payload)

        if qid:
            idx = next((i for i, q in enumerate(IN_MEMORY_QUOTES) if q.get('id') == qid), None)
            if idx is not None:
                IN_MEMORY_QUOTES[idx] = payload
            else:
                IN_MEMORY_QUOTES.insert(0, payload)
        else:
            IN_MEMORY_QUOTES.insert(0, payload)
        _trim_memory_pool()   # keep list bounded

        try:
            col = get_collection('quotes')
            if col is not None:
                if qid:
                    col.update_one({'id': qid}, {'$set': payload}, upsert=True)
                else:
                    col.insert_one(payload)
        except Exception as e:
            pass

        return Response(saved or payload, status=status.HTTP_201_CREATED)

    def delete(self, request):
        try:
            col = get_collection('quotes')
            if col is not None:
                col.delete_many({})
        except Exception:
            pass
        storage.clear_all_quotes()
        global IN_MEMORY_QUOTES, SEED_QUOTES
        IN_MEMORY_QUOTES.clear()
        SEED_QUOTES.clear()
        return Response({'ok': True, 'message': 'All quotations cleared successfully'})

class QuoteDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, quote_id):
        qid = (quote_id or '').strip().upper()
        found = _find_quote_anywhere(qid)
        if found:
            return Response(found)
        return Response({'detail': f'Quotation {quote_id} not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, quote_id):
        import re
        qid = (quote_id or '').strip().upper()
        deleted = False

        # 1. Delete from disk storage
        disk_deleted = storage.delete_quote_by_id(qid)
        if disk_deleted:
            deleted = True

        # 2. Delete from MongoDB
        try:
            col = get_collection('quotes')
            if col is not None:
                res = col.delete_many({'id': {'$regex': f'^{re.escape(qid)}$', '$options': 'i'}})
                if res.deleted_count > 0:
                    deleted = True
        except Exception:
            pass

        # 3. Delete from in-memory pool
        global IN_MEMORY_QUOTES
        before_count = len(IN_MEMORY_QUOTES)
        IN_MEMORY_QUOTES = [q for q in IN_MEMORY_QUOTES if (q.get('id') or '').strip().upper() != qid]
        if len(IN_MEMORY_QUOTES) < before_count:
            deleted = True

        return Response({'ok': True, 'quote_id': quote_id, 'deleted': deleted, 'message': f'Quotation {quote_id} deleted successfully'}, status=status.HTTP_200_OK)


def _find_quote_anywhere(qid):
    if not qid:
        return None
    found_disk = storage.get_quote_by_id(qid)
    if found_disk:
        return found_disk
    col = get_collection('quotes')
    if col is not None:
        try:
            q = col.find_one({'id': {'$regex': f'^{qid}$', '$options': 'i'}}, {'_id': 0})
            if q:
                storage.save_quote(q)
                return q
        except Exception:
            pass
    for pool in (IN_MEMORY_QUOTES, SEED_QUOTES):
        found = next((m for m in pool if m.get('id', '').lower() == str(qid).lower()), None)
        if found:
            return found
    return None


def _update_quote_anywhere(qid, update_fields):
    updated_obj = storage.update_quote_fields(qid, update_fields)
    col = get_collection('quotes')
    if col is not None:
        try:
            clean_set = {}
            top_keys = {k for k in update_fields.keys() if '.' not in k}
            for k, v in update_fields.items():
                if '.' in k:
                    prefix = k.split('.')[0]
                    if prefix in top_keys:
                        continue
                clean_set[k] = v
            col.update_one({'id': {'$regex': f'^{qid}$', '$options': 'i'}}, {'$set': clean_set}, upsert=True)
        except Exception:
            if updated_obj and isinstance(updated_obj, dict):
                try:
                    col.replace_one({'id': {'$regex': f'^{qid}$', '$options': 'i'}}, updated_obj, upsert=True)
                except Exception:
                    pass

    found_in_mem = False
    for pool in (IN_MEMORY_QUOTES, SEED_QUOTES):
        mq = next((m for m in pool if m.get('id', '').lower() == str(qid).lower()), None)
        if mq:
            found_in_mem = True
            for k, v in update_fields.items():
                if '.' in k:
                    parts = k.split('.')
                    curr = mq
                    for p in parts[:-1]:
                        if p not in curr or not isinstance(curr[p], dict):
                            curr[p] = {}
                        curr = curr[p]
                    curr[parts[-1]] = v
                else:
                    mq[k] = v
    if not found_in_mem:
        new_q = {'id': qid, **update_fields}
        IN_MEMORY_QUOTES.insert(0, new_q)
    return True


class QuoteAgentActionView(APIView):
    """Agent approve / reject a quote, or revise quote price, and store the decision."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        action = request.data.get('action', '').strip().lower()   # 'approved' | 'rejected' | 'revise_price'
        if action == 'approve':
            action = 'approved'
        elif action == 'reject':
            action = 'rejected'
        comment = request.data.get('comment', '').strip()
        agent_email = request.data.get('agent_email', '').strip()
        agent_name = request.data.get('agent_name', '').strip()
        quote_payload = request.data.get('quote')

        if action not in ('approved', 'rejected', 'revise_price'):
            return Response({'detail': 'action must be approved, rejected, or revise_price'}, status=status.HTTP_400_BAD_REQUEST)

        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Handle Price Revision by Agent
        if action == 'revise_price':
            revised_price = request.data.get('revised_price')
            try:
                revised_price = float(revised_price)
            except (TypeError, ValueError):
                return Response({'detail': 'Valid numeric revised_price required'}, status=status.HTTP_400_BAD_REQUEST)

            reason = (request.data.get('reason') or comment or '').strip()
            agent_price_edit = {
                'revised_price': revised_price,
                'reason': reason,
                'agent_name': agent_name or 'Freight Agent',
                'agent_email': agent_email,
                'edited_at': now_str,
            }

            try:
                if quote_payload and isinstance(quote_payload, dict):
                    col = get_collection('quotes')
                    if col is not None:
                        col.update_one({'id': qid}, {'$set': quote_payload}, upsert=True)

                _update_quote_anywhere(qid, {
                    'agent_price_edit': agent_price_edit,
                    'status': 'Price Revised (Awaiting Customer Decision)',
                    'pipeline_status': 'PRICE_REVISED',
                    'customer_decision': None
                })

                # Also sync linked shipment
                shipment_update = {
                    'status': 'Price Revised (Awaiting Customer Decision)',
                    'pipeline_status': 'PRICE_REVISED',
                    'cost': revised_price
                }
                storage.update_shipments_by_quote_id(qid, shipment_update)
                shipments_col = get_collection('shipments')
                if shipments_col is not None:
                    shipments_col.update_many(
                        {'$or': [{'quote_id': qid}, {'quoteId': qid}, {'id': qid}]},
                        {'$set': shipment_update}
                    )

                fresh_q = _find_quote_anywhere(qid)
                return Response({
                    'ok': True,
                    'quote_id': qid,
                    'agent_price_edit': agent_price_edit,
                    'status': 'Price Revised (Awaiting Customer Decision)',
                    'quote': fresh_q
                }, status=status.HTTP_200_OK)
            except Exception as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Handle Agent Approval or Rejection (including Final Sign-off after customer accepted revision)
        q = _find_quote_anywhere(qid)
        if not q and quote_payload and isinstance(quote_payload, dict):
            q = quote_payload
            col = get_collection('quotes')
            if col is not None:
                try:
                    col.update_one({'id': qid}, {'$set': q}, upsert=True)
                except Exception:
                    pass
            IN_MEMORY_QUOTES.insert(0, q)

        has_accepted_revision = bool(
            q and q.get('agent_price_edit', {}).get('revised_price') and
            (q.get('customer_decision', {}).get('status') == 'ACCEPTED' or 'PRICE ACCEPTED' in (q.get('status') or '').upper())
        )

        review = {
            'status': action,
            'comment': comment,
            'agent_email': agent_email,
            'agent_name': agent_name or 'Freight Agent',
            'reviewed_at': now_str,
        }

        if action == 'approved':
            # Check if customs already approved
            is_customs_done = bool(
                q and (
                    q.get('customs_review', {}).get('status') == 'approved' or
                    q.get('pipeline_status') == 'CUSTOMS_APPROVED' or
                    q.get('m3_customs', {}).get('compliance_status') == 'APPROVED'
                )
            )
            quote_status = 'Approved by Customs and Awaiting for Customer confirmation' if is_customs_done else 'Approved by Agent and Awaiting Customs Clearance'
            pipeline_status = 'CUSTOMS_APPROVED' if is_customs_done else 'AGENT_APPROVED'
        else:
            quote_status = 'Rejected by Agent'
            pipeline_status = 'AGENT_REJECTED'

        try:
            update_data = {
                'agent_review': review,
                'status': quote_status,
                'pipeline_status': pipeline_status
            }
            if q:
                if q.get('user_email'):
                    update_data['user_email'] = q['user_email']
                if q.get('customer'):
                    update_data['customer'] = q['customer']
                if q.get('laneName'):
                    update_data['laneName'] = q['laneName']
            if has_accepted_revision and action == 'approved':
                rev_val = float(q.get('agent_price_edit', {}).get('revised_price', 0)) if q else 0
                if rev_val > 0:
                    orig = q.get('original_indicative_total') or q.get('indicativeTotal')
                    update_data['indicativeTotal'] = rev_val
                    if orig and orig != rev_val:
                        update_data['original_indicative_total'] = orig

            _update_quote_anywhere(qid, update_data)

            # Update shipment if linked
            shipment_status = quote_status
            shipment_update = {
                'pipeline_status': pipeline_status,
                'status': shipment_status
            }
            if has_accepted_revision and action == 'approved' and rev_val > 0:
                shipment_update['cost'] = rev_val

            storage.update_shipments_by_quote_id(qid, shipment_update)
            shipments_col = get_collection('shipments')
            if shipments_col is not None:
                query_clauses = [{'quote_id': qid}, {'quoteId': qid}, {'id': qid}]
                if q and q.get('shipment_id'):
                    query_clauses.append({'shipment_id': q.get('shipment_id')})
                if q and q.get('tn'):
                    query_clauses.append({'tn': q.get('tn')})
                shipments_col.update_many(
                    {'$or': query_clauses},
                    {'$set': shipment_update}
                )
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'ok': True, 'quote_id': qid, 'review': review, 'status': quote_status})


class QuoteRouteSelectView(APIView):
    """Customer selects a recommended route option and submits it for approval."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        route = request.data.get('route') or {}
        requested_by = request.data.get('requested_by') or (request.user.email if request.user and request.user.is_authenticated else 'Customer')
        is_finalised = request.data.get('is_finalised', False)
        carrier_name = route.get('carrier') or request.data.get('carrier') or ''

        if not route or not route.get('carrier'):
            return Response({'detail': 'Valid route payload required'}, status=status.HTTP_400_BAD_REQUEST)

        now_str = datetime.now(timezone.utc).isoformat()
        route_record = {
            **route,
            'requested_by': requested_by,
            'selected_at': now_str,
            'approval_status': 'PENDING_APPROVAL' if is_finalised else 'DRAFT_SELECTED'
        }

        cost = route.get('cost')

        try:
            update_fields = {
                'selected_route': route_record,
                'carrier': carrier_name,
                'assigned_carrier': carrier_name,
                'is_finalised': bool(is_finalised),
                'route_approval_status': 'PENDING_APPROVAL' if is_finalised else 'DRAFT_SELECTED',
                'route_requested_at': now_str
            }
            if is_finalised:
                update_fields['status'] = 'Agent Approval Pending'
                update_fields['pipeline_status'] = 'AGENT_PENDING'
            if cost:
                update_fields['indicativeTotal'] = cost

            _update_quote_anywhere(qid, update_fields)

            # Sync linked shipment cost and carrier
            shipments_col = get_collection('shipments')
            if shipments_col is not None:
                shipment_update = {'carrier': carrier_name}
                if cost:
                    shipment_update['cost'] = cost
                query_clauses = [{'quote_id': qid}, {'quoteId': qid}]
                q = _find_quote_anywhere(qid)
                if q and q.get('shipment_id'):
                    query_clauses.append({'shipment_id': q.get('shipment_id')})
                shipments_col.update_many(
                    {'$or': query_clauses},
                    {'$set': shipment_update}
                )
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'ok': True,
            'quote_id': qid,
            'selected_route': route_record,
            'carrier': carrier_name,
            'is_finalised': bool(is_finalised),
            'indicativeTotal': cost
        }, status=status.HTTP_200_OK)


class QuoteCustomsActionView(APIView):
    """Customs Officer approves documentation or requests specific required documents."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        action = (request.data.get('action') or '').strip().lower() # 'approve' | 'request_documents' | 'reject'
        requested_docs = request.data.get('requested_docs') or []
        officer_notes = request.data.get('officer_notes') or request.data.get('comment') or ''
        officer_name = request.data.get('officer_name') or 'Customs Officer'
        officer_email = request.data.get('officer_email') or ''

        now_str = datetime.now(timezone.utc).isoformat()

        try:
            q = _find_quote_anywhere(qid)
            if not q:
                return Response({'detail': f'Quote {qid} not found'}, status=status.HTTP_404_NOT_FOUND)

            if action == 'approve':
                customs_review = {
                    'status': 'approved',
                    'officer_name': officer_name,
                    'officer_email': officer_email,
                    'reviewed_at': now_str,
                    'notes': officer_notes
                }
                # Both Agent and Customs approved -> Quote is ready for customer acceptance
                status_label = 'Approved by Customs and Awaiting for Customer confirmation'
                doc_req = q.get('customs_document_request') or {}
                if isinstance(doc_req, dict) and doc_req:
                    doc_req_update = {**doc_req, 'status': 'APPROVED', 'approved_at': now_str}
                else:
                    doc_req_update = {'status': 'APPROVED', 'approved_at': now_str}

                _update_quote_anywhere(qid, {
                    'customs_review': customs_review,
                    'customs_document_request': doc_req_update,
                    'status': status_label,
                    'pipeline_status': 'CUSTOMS_APPROVED',
                    'm3_customs.compliance_status': 'APPROVED',
                    'm3_customs.requires_officer_review': False
                })

            elif action == 'request_documents':
                doc_request = {
                    'requested_docs': requested_docs,
                    'officer_notes': officer_notes,
                    'requested_at': now_str,
                    'officer_name': officer_name,
                    'status': 'PENDING_CUSTOMER_UPLOAD'
                }
                status_label = 'Documents Requested by Customs'
                _update_quote_anywhere(qid, {
                    'customs_document_request': doc_request,
                    'status': status_label,
                    'pipeline_status': 'CUSTOMS_DOCS_REQUESTED'
                })

            elif action == 'reject':
                customs_review = {
                    'status': 'rejected',
                    'officer_name': officer_name,
                    'officer_email': officer_email,
                    'reviewed_at': now_str,
                    'notes': officer_notes
                }
                _update_quote_anywhere(qid, {
                    'customs_review': customs_review,
                    'status': 'Rejected by Customs',
                    'pipeline_status': 'CUSTOMS_REJECTED'
                })
                status_label = 'Rejected by Customs'
            else:
                return Response({'detail': 'action must be approve, request_documents, or reject'}, status=status.HTTP_400_BAD_REQUEST)

            # Update shipment if linked
            shipments_col = get_collection('shipments')
            if shipments_col is not None:
                shipment_query = []
                if q.get('shipment_id'):
                    shipment_query.append({'shipment_id': q.get('shipment_id')})
                if q.get('id'):
                    shipment_query.append({'quote_id': q.get('id')})
                    shipment_query.append({'id': q.get('id')})
                if q.get('tn'):
                    shipment_query.append({'tn': q.get('tn')})
                if shipment_query:
                    shipment_update = {'customs_status': status_label, 'status': status_label}
                    if action == 'approve':
                        shipment_update['customs_verified'] = True
                        shipment_update['pipeline_status'] = 'CUSTOMS_APPROVED'
                    elif action == 'reject':
                        shipment_update['pipeline_status'] = 'CUSTOMS_REJECTED'
                    storage.update_shipments_by_quote_id(qid, shipment_update)
                    shipments_col.update_many(
                        {'$or': shipment_query},
                        {'$set': shipment_update}
                    )

            return Response({'ok': True, 'quote_id': qid, 'action': action, 'status': status_label})

        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuoteDocumentUploadView(APIView):
    """Customer uploads required customs compliance documents."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        uploaded_docs = request.data.get('uploaded_docs') or [] # list of { name, file_name, file_size, file_type }
        uploaded_by = request.data.get('uploaded_by') or 'Customer'
        now_str = datetime.now(timezone.utc).isoformat()

        if not uploaded_docs:
            return Response({'detail': 'No documents provided in upload'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            q = _find_quote_anywhere(qid)
            if not q:
                return Response({'detail': f'Quote {qid} not found'}, status=status.HTTP_404_NOT_FOUND)

            # Update checklist items in quote's m3_customs
            m3_c = q.get('m3_customs') or {}
            checklist = m3_c.get('checklist') or []
            uploaded_names = {d.get('name', '').strip().lower() for d in uploaded_docs}

            for item in checklist:
                item_name = (item.get('item_name') or item.get('name') or '').strip().lower()
                if item_name in uploaded_names:
                    item['document_uploaded'] = True
                    item['status'] = 'VERIFIED'
                    item['uploaded_at'] = now_str

            # Recalculate readiness
            tot = max(1, len(checklist))
            up_cnt = sum(1 for item in checklist if item.get('document_uploaded'))
            readiness = round((up_cnt / tot) * 100)
            m3_c['readiness_score'] = readiness
            m3_c['checklist'] = checklist

            # Append to uploaded documents history
            existing_uploads = q.get('customer_uploaded_documents') or []
            for ud in uploaded_docs:
                existing_uploads.append({
                    **ud,
                    'uploaded_by': uploaded_by,
                    'uploaded_at': now_str
                })

            _update_quote_anywhere(qid, {
                'm3_customs': m3_c,
                'customer_uploaded_documents': existing_uploads,
                'customs_document_request.status': 'DOCUMENTS_SUBMITTED',
                'status': 'Documents Submitted (Pending Customs Sign-off)',
                'pipeline_status': 'DOCS_SUBMITTED'
            })

            return Response({
                'ok': True,
                'quote_id': qid,
                'readiness_score': readiness,
                'status': 'Documents Submitted (Pending Customs Sign-off)',
                'uploaded_count': len(uploaded_docs)
            }, status=status.HTTP_200_OK)

        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuoteCustomerDecisionView(APIView):
    """Customer accept / reject a quote and persist the decision."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        import uuid
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        decision = (request.data.get('decision') or request.data.get('action') or '').strip().lower() # 'accepted' | 'booked' | 'rejected' | 'declined' | 'accept_revision'
        notes = request.data.get('notes', '').strip()
        customer_email = request.data.get('customer_email') or (request.user.email if request.user and request.user.is_authenticated else '')
        customer_name = request.data.get('customer_name') or 'Customer'

        if decision not in ('accepted', 'booked', 'rejected', 'declined', 'accept_revision'):
            return Response({'detail': 'decision must be accepted, booked, or rejected'}, status=status.HTTP_400_BAD_REQUEST)

        q = _find_quote_anywhere(qid) or {}
        q_status_upper = (q.get('status') or '').upper()
        is_revision_acceptance = bool(
            decision == 'accept_revision' or
            ('PRICE REVISED' in q_status_upper and decision == 'accepted')
        )
        is_booking_confirmation = bool(
            decision in ('accepted', 'booked') and not is_revision_acceptance
        )

        record = {
            'status': 'ACCEPTED' if is_revision_acceptance else ('BOOKED' if is_booking_confirmation else 'REJECTED'),
            'notes': notes,
            'customer_email': customer_email,
            'customer_name': customer_name,
            'decided_at': datetime.now(timezone.utc).isoformat(),
            'is_revised_price': is_revision_acceptance,
            'is_booking_confirmation': is_booking_confirmation
        }

        if is_booking_confirmation:
            quote_status = 'Booked'
            pipeline_status = 'BOOKED'
        elif is_revision_acceptance:
            quote_status = 'Revised Priced Accepted (Agent Approval Pending)'
            pipeline_status = 'REVISED_PRICED_ACCEPTED'
        else:
            cust_name_str = customer_name or 'Customer'
            if 'PRICE REVISED' in q_status_upper or (q.get('agent_price_edit') and not q.get('customer_decision')):
                quote_status = 'Revised Price Declined'
                pipeline_status = 'REVISED_PRICE_DECLINED'
            else:
                quote_status = f"Booking decline by Customer ({cust_name_str})"
                pipeline_status = 'BOOKING_DECLINED'

        rev_val = float(q.get('agent_price_edit', {}).get('revised_price', 0)) if q.get('agent_price_edit') else 0
        effective_cost = rev_val if rev_val > 0 else (q.get('indicativeTotal') or 0)

        try:
            update_payload = {
                'customer_decision': record,
                'status': quote_status,
                'pipeline_status': pipeline_status,
                'booking_confirmed': quote_status == 'Booked'
            }
            if rev_val > 0:
                orig = q.get('original_indicative_total') or q.get('indicativeTotal')
                update_payload['indicativeTotal'] = rev_val
                if orig and orig != rev_val:
                    update_payload['original_indicative_total'] = orig

            _update_quote_anywhere(qid, update_payload)

            # If shipment linked, update shipment too
            shipment_status = quote_status
            pipe_status = 'CONFIRMED' if quote_status == 'Booked' else ('PRICE_ACCEPTED_PENDING_AGENT' if is_revision_acceptance else 'CANCELLED')
            query_clauses = [{'quote_id': qid}, {'quoteId': qid}]
            if q.get('shipment_id'):
                query_clauses.append({'shipment_id': q.get('shipment_id')})
            if q.get('tn'):
                query_clauses.append({'tn': q.get('tn')})

            shipment_update = {
                'pipeline_status': pipe_status,
                'status': shipment_status,
                'booking_status': 'CONFIRMED' if quote_status == 'Booked' else shipment_status,
                'cost': effective_cost,
                'carrier': q.get('selected_route', {}).get('carrier') or q.get('carrier') or 'Standard Carrier'
            }
            storage.update_shipments_by_quote_id(qid, shipment_update)
            shipments_col = get_collection('shipments')
            if shipments_col is not None and q:
                matched_res = shipments_col.update_many(
                    {'$or': query_clauses},
                    {'$set': shipment_update}
                )

                # If booked and no shipment document existed yet in MongoDB, create it so tracking and portals show it immediately
                if quote_status == 'Booked' and (not matched_res or matched_res.matched_count == 0):
                    new_shp_id = q.get('shipment_id') or f"SHP-{uuid.uuid4().hex[:8].upper()}"
                    tn_num = q.get('tn') or f"TN26-{qid.replace('QT-', '')}"
                    created_shipment = {
                        'id': new_shp_id,
                        'shipment_id': new_shp_id,
                        'tn': tn_num,
                        'quote_id': qid,
                        'quoteId': qid,
                        'customer': q.get('customer') or customer_name or 'Shipper',
                        'user_email': (customer_email or q.get('user_email') or '').lower(),
                        'lane': q.get('laneCode') or q.get('laneName') or 'Global Lane',
                        'origin': q.get('origin') or (q.get('laneCode', '').split('->')[0].strip() if '->' in q.get('laneCode', '') else 'Origin Gateway'),
                        'destination': q.get('destination') or (q.get('laneCode', '').split('->')[1].strip() if '->' in q.get('laneCode', '') else 'Dest Gateway'),
                        'mode': q.get('mode') or 'Ocean FCL',
                        'basis': q.get('basis') or 'Standard',
                        'carrier': q.get('selected_route', {}).get('carrier') or q.get('carrier') or 'Carrier',
                        'cost': effective_cost,
                        'status': 'Booked',
                        'pipeline_status': 'CONFIRMED',
                        'booking_status': 'CONFIRMED',
                        'customs_status': 'Approved by Customs',
                        'customs_verified': True,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'route': q.get('selected_route') or {}
                    }
                    shipments_col.insert_one(created_shipment)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'ok': True,
            'quote_id': qid,
            'status': quote_status,
            'customer_decision': record
        }, status=status.HTTP_200_OK)


