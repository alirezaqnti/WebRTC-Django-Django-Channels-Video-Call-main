from django.shortcuts import render
import logging

# Create your views here.
def index(request):
    logging.debug("Oh hai!")
    return render(request, "index.html")
